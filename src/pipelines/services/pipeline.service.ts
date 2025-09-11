import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { InputJsonValue } from '@prisma/client/runtime/library';
import { YamlValidatorUtil } from '../../common/utils';
import * as crypto from 'crypto';
import * as yaml from 'js-yaml';

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async pipelineCreate(
    projectId: string,
    name: string,
    yamlContent: string,
    description?: string,
  ) {
    try {
      // YAML 형식 및 build 필드 검증
      YamlValidatorUtil.validateBuildField(yamlContent);

      // YAML 파싱
      let parsedSpec: InputJsonValue;
      try {
        parsedSpec = yaml.load(yamlContent) as InputJsonValue;
        this.logger.log(`YAML 파싱 성공: ${name}`);
      } catch (error) {
        this.logger.error('YAML 파싱 실패', error);
        throw new BadRequestException('YAML 파싱에 실패했습니다.');
      }

      // 프로젝트 존재 여부 확인
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new NotFoundException('프로젝트를 찾을 수 없습니다.');
      }

      // 파이프라인 생성
      const pipeline = await this.prisma.pipeline.create({
        data: {
          projectId,
          name: name.trim(),
          description,
          pipelineYaml: yamlContent,
          visualConfig: parsedSpec,
          triggerBranches: [],
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      this.logger.log(`파이프라인 생성 완료: ${pipeline.id}`);
      return pipeline;
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        throw new BadRequestException(
          '동일한 이름과 버전의 파이프라인이 이미 존재합니다.',
        );
      }
      throw error;
    }
  }

  async pipelineGetByProject(projectId: string) {
    const pipelines = await this.prisma.pipeline.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return pipelines;
  }

  async pipelineGetById(pipelineId: string) {
    const pipeline = await this.prisma.pipeline.findUnique({
      where: { id: pipelineId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        executions: {
          orderBy: { createdAt: 'desc' },
          take: 10, // 최근 10개 실행 기록
        },
      },
    });

    if (!pipeline) {
      throw new NotFoundException('파이프라인을 찾을 수 없습니다.');
    }

    return pipeline;
  }

  /**
   * 수동 실행으로 파이프라인 런을 생성합니다
   */
  async pipelineCreateRun(
    pipelineId: string,
    params: {
      branch?: string;
      commitSha?: string;
      commitMessage?: string;
    },
  ) {
    const pipeline = await this.prisma.pipeline.findUnique({
      where: { id: pipelineId },
      include: {
        project: true,
      },
    });
    if (!pipeline) {
      throw new NotFoundException('파이프라인을 찾을 수 없습니다.');
    }

    const execution = await this.prisma.pipelineExecution.create({
      data: {
        pipelineId: pipeline.id,
        executionId: crypto.randomUUID(),
        status: 'PENDING',
        triggerType: 'MANUAL',
        branch: params.branch,
        commitSha: params.commitSha,
        commitMessage: params.commitMessage,
        pipelineYaml: pipeline.pipelineYaml || '',
      },
    });

    return execution;
  }

  /**
   * 파이프라인 자동 실행 (웹훅 트리거용)
   */
  startPipelineExecution(executionId: string): void {
    // 백그라운드에서 실행하여 웹훅 응답 지연 방지
    setImmediate(() => {
      void this.executePipeline(executionId).catch((error: unknown) => {
        console.error(
          `[Pipeline] Execution failed for execution ${executionId}:`,
          String(error),
        );
      });
    });
  }

  /**
   * 파이프라인 실제 실행 로직
   */
  private async executePipeline(executionId: string) {
    try {
      // 실행 시작 상태로 변경
      const execution = await this.prisma.pipelineExecution.update({
        where: { id: executionId },
        data: {
          status: 'RUNNING',
          startedAt: new Date(),
        },
        include: {
          pipeline: true,
        },
      });

      console.log(`[Pipeline] Starting execution for execution ${executionId}`);

      // 파이프라인 스펙 파싱
      const pipelineSpec = execution.pipeline.visualConfig as Record<
        string,
        unknown
      >;
      const jobs = this.parseJobsFromPipelineSpec(pipelineSpec);

      // Job 순차 실행
      for (const jobConfig of jobs) {
        await this.executeJob(executionId, jobConfig);
      }

      // 성공 상태로 변경
      await this.prisma.pipelineExecution.update({
        where: { id: executionId },
        data: {
          status: 'SUCCESS',
          completedAt: new Date(),
        },
      });

      console.log(
        `[Pipeline] Execution completed successfully for execution ${executionId}`,
      );
    } catch (error) {
      // 실패 상태로 변경
      await this.prisma.pipelineExecution.update({
        where: { id: executionId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
        },
      });

      console.error(
        `[Pipeline] Execution failed for execution ${executionId}:`,
        String(error),
      );
      throw error;
    }
  }

  /**
   * 파이프라인 스펙에서 Job 목록 추출
   */
  private parseJobsFromPipelineSpec(spec: Record<string, unknown>): Array<{
    name: string;
    type: string;
    commands: string[];
  }> {
    const jobs: Array<{ name: string; type: string; commands: string[] }> = [];

    // build 단계
    if (spec.build) {
      const buildCommands = Array.isArray(spec.build)
        ? (spec.build as string[])
        : [spec.build as string];
      jobs.push({
        name: 'build',
        type: 'BUILD',
        commands: buildCommands,
      });
    }

    // test 단계
    if (spec.test) {
      const testCommands = Array.isArray(spec.test)
        ? (spec.test as string[])
        : [spec.test as string];
      jobs.push({
        name: 'test',
        type: 'TEST',
        commands: testCommands,
      });
    }

    // deploy 단계
    if (spec.deploy) {
      const deployCommands = Array.isArray(spec.deploy)
        ? (spec.deploy as string[])
        : [spec.deploy as string];
      jobs.push({
        name: 'deploy',
        type: 'DEPLOYMENT',
        commands: deployCommands,
      });
    }

    return jobs;
  }

  /**
   * 개별 Job 실행 시뮬레이션
   */
  private async executeJob(
    runId: string,
    jobConfig: {
      name: string;
      type: string;
      commands: string[];
    },
  ) {
    try {
      console.log(
        `[Job] Starting ${jobConfig.name} (${jobConfig.type}) for execution ${runId}`,
      );

      // 실제 Job 생성은 생략하고 실행만 시뮬레이션
      await this.simulateJobExecution(jobConfig);

      console.log(`[Job] Completed ${jobConfig.name} for execution ${runId}`);
    } catch (error) {
      console.error(
        `[Job] Failed ${jobConfig.name} for execution ${runId}:`,
        String(error),
      );
      throw error;
    }
  }

  /**
   * Job 실행 시뮬레이션 (추후 실제 실행 로직으로 교체)
   */
  private async simulateJobExecution(jobConfig: {
    name: string;
    type: string;
    commands: string[];
  }) {
    console.log(
      `[Job Simulation] Executing ${jobConfig.name}:`,
      jobConfig.commands,
    );

    // 실행 시간 시뮬레이션 (2-5초)
    const executionTime = 2000 + Math.random() * 3000;
    await new Promise((resolve) => setTimeout(resolve, executionTime));

    // 5% 확률로 실패 시뮬레이션
    if (Math.random() < 0.05) {
      throw new Error(`Simulated failure in ${jobConfig.name} job`);
    }
  }
}

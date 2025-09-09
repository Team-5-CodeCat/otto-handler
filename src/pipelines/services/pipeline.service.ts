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
    projectID: string,
    name: string,
    yamlContent: string,
    version: number = 1,
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
        where: { projectID },
      });

      if (!project) {
        throw new NotFoundException('프로젝트를 찾을 수 없습니다.');
      }

      // YAML 해시 생성 (중복 체크용)
      const specHash = crypto
        .createHash('sha256')
        .update(yamlContent)
        .digest('hex');

      // 파이프라인 생성
      const pipeline = await this.prisma.pipeline.create({
        data: {
          projectID,
          name: name.trim(),
          version,
          pipelineSpec: parsedSpec,
          originalSpec: yamlContent,
          normalizedSpec: parsedSpec,
          specHash,
        },
        include: {
          project: {
            select: {
              projectID: true,
              name: true,
            },
          },
        },
      });

      this.logger.log(`파이프라인 생성 완료: ${pipeline.pipelineID}`);
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

  async pipelineGetByProject(projectID: string) {
    const pipelines = await this.prisma.pipeline.findMany({
      where: { projectID },
      orderBy: { createdAt: 'desc' },
      include: {
        project: {
          select: {
            projectID: true,
            name: true,
          },
        },
      },
    });

    return pipelines;
  }

  async pipelineGetById(pipelineID: string) {
    const pipeline = await this.prisma.pipeline.findUnique({
      where: { pipelineID },
      include: {
        project: {
          select: {
            projectID: true,
            name: true,
          },
        },
        runs: {
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
    pipelineID: string,
    params: {
      labels?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
      idempotencyKey?: string;
      externalRunKey?: string;
      owner?: string;
    },
  ) {
    const pipeline = await this.prisma.pipeline.findUnique({
      where: { pipelineID },
    });
    if (!pipeline) {
      throw new NotFoundException('파이프라인을 찾을 수 없습니다.');
    }

    // 멱등키가 있으면 동일 키 중복 방지
    if (params.idempotencyKey) {
      const existing = await this.prisma.pipelineRun.findUnique({
        where: { idempotencyKey: params.idempotencyKey },
      });
      if (existing) {
        return existing;
      }
    }

    const run = await this.prisma.pipelineRun.create({
      data: {
        pipelineID: pipeline.pipelineID,
        pipelineVersion: pipeline.version,
        status: 'pending' as never,
        trigger: 'manual',
        labels: (params.labels ?? {}) as never,
        metadata: (params.metadata ?? {}) as never,
        idempotencyKey: params.idempotencyKey,
        externalRunKey: params.externalRunKey,
        owner: params.owner,
      },
    });

    return run;
  }

  /**
   * 파이프라인 자동 실행 (웹훅 트리거용)
   */
  async startPipelineExecution(runId: string) {
    // 백그라운드에서 실행하여 웹훅 응답 지연 방지
    setImmediate(() => {
      this.executePipeline(runId).catch((error) => {
        console.error(`[Pipeline] Execution failed for run ${runId}:`, error);
      });
    });
  }

  /**
   * 파이프라인 실제 실행 로직
   */
  private async executePipeline(runId: string) {
    try {
      // 실행 시작 상태로 변경
      const run = await this.prisma.pipelineRun.update({
        where: { id: runId },
        data: {
          status: 'running' as never,
          startedAt: new Date(),
        },
        include: {
          pipeline: true,
        },
      });

      console.log(`[Pipeline] Starting execution for run ${runId}`);

      // 파이프라인 스펙 파싱
      const pipelineSpec = run.pipeline.pipelineSpec as any;
      const jobs = this.parseJobsFromPipelineSpec(pipelineSpec);

      // Job 순차 실행
      for (const jobConfig of jobs) {
        await this.executeJob(runId, run.pipelineID, jobConfig);
      }

      // 성공 상태로 변경
      await this.prisma.pipelineRun.update({
        where: { id: runId },
        data: {
          status: 'success' as never,
          finishedAt: new Date(),
          exitCode: 0,
        },
      });

      console.log(`[Pipeline] Execution completed successfully for run ${runId}`);

    } catch (error) {
      // 실패 상태로 변경
      await this.prisma.pipelineRun.update({
        where: { id: runId },
        data: {
          status: 'failed' as never,
          finishedAt: new Date(),
          exitCode: 1,
        },
      });

      console.error(`[Pipeline] Execution failed for run ${runId}:`, error);
      throw error;
    }
  }

  /**
   * 파이프라인 스펙에서 Job 목록 추출
   */
  private parseJobsFromPipelineSpec(spec: any): Array<{
    name: string;
    type: string;
    commands: string[];
  }> {
    const jobs: Array<{ name: string; type: string; commands: string[] }> = [];

    // build 단계
    if (spec.build) {
      jobs.push({
        name: 'build',
        type: 'BUILD',
        commands: Array.isArray(spec.build) ? spec.build : [spec.build],
      });
    }

    // test 단계
    if (spec.test) {
      jobs.push({
        name: 'test',
        type: 'TEST',
        commands: Array.isArray(spec.test) ? spec.test : [spec.test],
      });
    }

    // deploy 단계
    if (spec.deploy) {
      jobs.push({
        name: 'deploy',
        type: 'DEPLOYMENT',
        commands: Array.isArray(spec.deploy) ? spec.deploy : [spec.deploy],
      });
    }

    return jobs;
  }

  /**
   * 개별 Job 실행 시뮬레이션
   */
  private async executeJob(runId: string, pipelineId: string, jobConfig: {
    name: string;
    type: string;
    commands: string[];
  }) {
    try {
      console.log(`[Job] Starting ${jobConfig.name} (${jobConfig.type}) for run ${runId}`);
      
      // 실제 Job 생성은 생략하고 실행만 시뮬레이션
      await this.simulateJobExecution(jobConfig);

      console.log(`[Job] Completed ${jobConfig.name} for run ${runId}`);

    } catch (error) {
      console.error(`[Job] Failed ${jobConfig.name} for run ${runId}:`, error);
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
    console.log(`[Job Simulation] Executing ${jobConfig.name}:`, jobConfig.commands);
    
    // 실행 시간 시뮬레이션 (2-5초)
    const executionTime = 2000 + Math.random() * 3000;
    await new Promise(resolve => setTimeout(resolve, executionTime));
    
    // 5% 확률로 실패 시뮬레이션
    if (Math.random() < 0.05) {
      throw new Error(`Simulated failure in ${jobConfig.name} job`);
    }
  }
}

import { Controller, HttpStatus } from '@nestjs/common';
import {
  TypedBody,
  TypedRoute,
  TypedParam,
  TypedException,
} from '@nestia/core';
import { PipelineService } from '../services/pipeline.service';
import { AuthGuard } from '../../common/decorators';
import type { CommonErrorResponseDto } from '../../common/dto';
import type {
  CreatePipelineRequestDto,
  CreatePipelineResponseDto,
  GetPipelinesByProjectResponseDto,
  GetPipelineByIdResponseDto,
  KVType,
} from '../dtos';
import type { CreatePipelineRunRequestDto } from '../dtos/request/create-pipeline-run-request.dto';
import type { CreatePipelineRunResponseDto } from '../dtos/response/create-pipeline-run-response.dto';
import { tags } from 'typia';

@Controller('pipelines')
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  /**
   * @tag pipeline
   * @summary YAML 파이프라인 생성
   * @description otto-front에서 YAML 파일 내용을 받아서 파이프라인을 생성합니다
   */
  @AuthGuard()
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.UNAUTHORIZED,
    description: '로그인 필요',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.BAD_REQUEST,
    description: '잘못된 요청 (유효하지 않은 YAML 등)',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.NOT_FOUND,
    description: '프로젝트를 찾을 수 없음',
  })
  @TypedRoute.Post('/')
  async pipelineCreate(
    @TypedBody() createPipelineDto: CreatePipelineRequestDto,
  ): Promise<CreatePipelineResponseDto> {
    const pipeline = await this.pipelineService.pipelineCreate(
      createPipelineDto.projectId,
      createPipelineDto.name,
      createPipelineDto.yamlContent,
      createPipelineDto.description,
    );

    return {
      id: pipeline.id,
      name: pipeline.name,
      description: pipeline.description,
      isActive: pipeline.isActive,
      projectId: pipeline.projectId,
      triggerType: pipeline.triggerType,
      triggerBranches: pipeline.triggerBranches,
      pipelineYaml: pipeline.pipelineYaml,
      visualConfig: pipeline.visualConfig as KVType,
      createdAt: pipeline.createdAt.toISOString(),
      updatedAt: pipeline.updatedAt.toISOString(),
    };
  }

  /**
   * @tag pipeline
   * @summary 프로젝트별 파이프라인 목록 조회
   */
  @AuthGuard()
  @TypedRoute.Get('/project/:projectId')
  async pipelineGetByProject(
    @TypedParam('projectId') projectId: string & tags.Format<'uuid'>,
  ): Promise<GetPipelinesByProjectResponseDto> {
    const pipelines =
      await this.pipelineService.pipelineGetByProject(projectId);

    console.log(pipelines);
    return {
      pipelines: pipelines.map((pipeline) => ({
        id: pipeline.id,
        name: pipeline.name,
        description: pipeline.description,
        isActive: pipeline.isActive,
        projectId: pipeline.projectId,
        triggerType: pipeline.triggerType,
        triggerBranches: pipeline.triggerBranches,
        pipelineYaml: pipeline.pipelineYaml,
        visualConfig: pipeline.visualConfig as KVType | null,
        createdAt: pipeline.createdAt.toISOString(),
        updatedAt: pipeline.updatedAt.toISOString(),
        project: {
          id: pipeline.project.id,
          name: pipeline.project.name,
        },
      })),
    };
  }

  /**
   * @tag pipeline
   * @summary 파이프라인 상세 조회
   */
  @AuthGuard()
  @TypedRoute.Get('/:pipelineId')
  async pipelineGetById(
    @TypedParam('pipelineId') pipelineId: string & tags.Format<'uuid'>,
  ): Promise<GetPipelineByIdResponseDto> {
    const pipeline = await this.pipelineService.pipelineGetById(pipelineId);

    return {
      id: pipeline.id,
      name: pipeline.name,
      description: pipeline.description,
      isActive: pipeline.isActive,
      projectId: pipeline.projectId,
      triggerType: pipeline.triggerType,
      triggerBranches: pipeline.triggerBranches,
      pipelineYaml: pipeline.pipelineYaml,
      visualConfig: pipeline.visualConfig as KVType | null,
      createdAt: pipeline.createdAt.toISOString(),
      updatedAt: pipeline.updatedAt.toISOString(),
      project: {
        id: pipeline.project.id,
        name: pipeline.project.name,
      },
      executions: pipeline.executions.map((execution) => ({
        id: execution.id,
        pipelineId: execution.pipelineId,
        executionId: execution.executionId,
        status: execution.status,
        triggerType: execution.triggerType,
        branch: execution.branch,
        commitSha: execution.commitSha,
        commitMessage: execution.commitMessage,
        startedAt: execution.startedAt?.toISOString() ?? null,
        completedAt: execution.completedAt?.toISOString() ?? null,
        duration: execution.duration,
        createdAt: execution.createdAt.toISOString(),
        updatedAt: execution.updatedAt.toISOString(),
      })),
    };
  }

  /**
   * @tag pipeline
   * @summary 파이프라인 수동 실행 (Run)
   */
  @AuthGuard()
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.UNAUTHORIZED,
    description: '로그인 필요',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.NOT_FOUND,
    description: '파이프라인을 찾을 수 없음',
  })
  @TypedRoute.Post('/:pipelineId/runs')
  async pipelineCreateRun(
    @TypedParam('pipelineId') pipelineId: string & tags.Format<'uuid'>,
    @TypedBody() dto: CreatePipelineRunRequestDto,
  ): Promise<CreatePipelineRunResponseDto> {
    const { branch, commitSha, commitMessage } = dto;
    const execution = await this.pipelineService.pipelineCreateRun(pipelineId, {
      branch,
      commitSha,
      commitMessage,
    });

    return {
      execution: {
        id: execution.id,
        pipelineId: execution.pipelineId,
        executionId: execution.executionId,
        status: execution.status,
        triggerType: execution.triggerType,
        branch: execution.branch ?? null,
        commitSha: execution.commitSha ?? null,
        commitMessage: execution.commitMessage ?? null,
        startedAt: execution.startedAt?.toISOString() ?? null,
        completedAt: execution.completedAt?.toISOString() ?? null,
        duration: execution.duration ?? null,
        createdAt: execution.createdAt.toISOString(),
        updatedAt: execution.updatedAt.toISOString(),
      },
    };
  }
}

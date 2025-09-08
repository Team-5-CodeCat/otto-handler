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
      createPipelineDto.projectID,
      createPipelineDto.name,
      createPipelineDto.yamlContent,
      createPipelineDto.version ?? 1,
    );

    return {
      pipelineID: pipeline.pipelineID,
      name: pipeline.name,
      version: pipeline.version,
      active: pipeline.active,
      projectID: pipeline.projectID,
      owner: pipeline.owner ?? null,
      pipelineSpec: pipeline.pipelineSpec as KVType,
      originalSpec: pipeline.originalSpec ?? null,
      normalizedSpec: (pipeline.normalizedSpec as KVType) ?? null,
      specHash: pipeline.specHash ?? null,
      createdAt: pipeline.createdAt.toISOString(),
      updatedAt: pipeline.updatedAt.toISOString(),
    };
  }

  /**
   * @tag pipeline
   * @summary 프로젝트별 파이프라인 목록 조회
   */
  @AuthGuard()
  @TypedRoute.Get('/project/:projectID')
  async pipelineGetByProject(
    @TypedParam('projectID') projectID: string & tags.Format<'uuid'>,
  ): Promise<GetPipelinesByProjectResponseDto> {
    const pipelines = await this.pipelineService.pipelineGetByProject(projectID);
    
    return {
      pipelines: pipelines.map(pipeline => ({
        pipelineID: pipeline.pipelineID,
        name: pipeline.name,
        version: pipeline.version,
        active: pipeline.active,
        projectID: pipeline.projectID,
        owner: pipeline.owner,
        pipelineSpec: pipeline.pipelineSpec as KVType,
        originalSpec: pipeline.originalSpec,
        normalizedSpec: pipeline.normalizedSpec as KVType | null,
        specHash: pipeline.specHash,
        createdAt: pipeline.createdAt.toISOString(),
        updatedAt: pipeline.updatedAt.toISOString(),
        project: {
          projectID: pipeline.project.projectID,
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
  @TypedRoute.Get('/:pipelineID')
  async pipelineGetById(
    @TypedParam('pipelineID') pipelineID: string & tags.Format<'uuid'>,
  ): Promise<GetPipelineByIdResponseDto> {
    const pipeline = await this.pipelineService.pipelineGetById(pipelineID);
    
    return {
      pipelineID: pipeline.pipelineID,
      name: pipeline.name,
      version: pipeline.version,
      active: pipeline.active,
      projectID: pipeline.projectID,
      owner: pipeline.owner,
      pipelineSpec: pipeline.pipelineSpec as KVType,
      originalSpec: pipeline.originalSpec,
      normalizedSpec: pipeline.normalizedSpec as KVType | null,
      specHash: pipeline.specHash,
      createdAt: pipeline.createdAt.toISOString(),
      updatedAt: pipeline.updatedAt.toISOString(),
      project: {
        projectID: pipeline.project.projectID,
        name: pipeline.project.name,
      },
      runs: pipeline.runs.map(run => ({
        id: run.id,
        pipelineID: run.pipelineID,
        pipelineVersion: run.pipelineVersion,
        status: run.status,
        queuedAt: run.queuedAt?.toISOString() ?? null,
        startedAt: run.startedAt?.toISOString() ?? null,
        finishedAt: run.finishedAt?.toISOString() ?? null,
        exitCode: run.exitCode,
        owner: run.owner,
        agent: run.agent,
        containerImage: run.containerImage,
        trigger: run.trigger,
        labels: run.labels as Record<string, unknown> | null,
        metadata: run.metadata as Record<string, unknown> | null,
        externalRunKey: run.externalRunKey,
        idempotencyKey: run.idempotencyKey,
        createdAt: run.createdAt.toISOString(),
      })),
    };
  }
}

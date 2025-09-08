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
  async createPipeline(
    @TypedBody() createPipelineDto: CreatePipelineRequestDto,
  ): Promise<CreatePipelineResponseDto> {
    const pipeline = await this.pipelineService.createPipeline(
      createPipelineDto.projectID,
      createPipelineDto.name,
      createPipelineDto.yamlContent,
      createPipelineDto.isBlockBased ?? false,
      createPipelineDto.version ?? 1,
    );

    return {
      pipelineID: pipeline.pipelineID,
      name: pipeline.name,
      version: pipeline.version,
      active: pipeline.active,
      projectID: pipeline.projectID,
      isBlockBased: pipeline.isBlockBased,
      owner: pipeline.owner ?? undefined,
      pipelineSpec: pipeline.pipelineSpec,
      originalSpec: pipeline.originalSpec ?? undefined,
      normalizedSpec: pipeline.normalizedSpec ?? undefined,
      specHash: pipeline.specHash ?? undefined,
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
  async getPipelinesByProject(
    @TypedParam('projectID') projectID: string & tags.Format<'uuid'>,
  ) {
    return await this.pipelineService.getPipelinesByProject(projectID);
  }

  /**
   * @tag pipeline
   * @summary 파이프라인 상세 조회
   */
  @AuthGuard()
  @TypedRoute.Get('/:pipelineID')
  async getPipelineById(
    @TypedParam('pipelineID') pipelineID: string & tags.Format<'uuid'>,
  ) {
    return await this.pipelineService.getPipelineById(pipelineID);
  }
}

import { Controller, HttpCode, HttpStatus, Req } from '@nestjs/common';
import {
  TypedBody,
  TypedException,
  TypedRoute,
  TypedQuery,
  TypedParam,
} from '@nestia/core';
import type {
  CreatePipelineRequestDto,
  UpdatePipelineRequestDto,
  PipelineResponseDto,
  PipelineDetailResponseDto,
  PipelineListResponseDto,
  JsonToBuildSpecRequestDto,
  JsonToBuildSpecResponseDto,
  BuildSpecToJsonRequestDto,
  BuildSpecToJsonResponseDto,
  PipelineFlowData,
} from '../dto';
import { PipelineService, BuildSpecConverterService } from '../services';
import type { CommonErrorResponseDto } from '../../common/dto';
import type { IRequestType } from '../../common/type';
import { AuthGuard } from '../../common/decorators';

interface PipelineQueryParams {
  /**
   * 페이지 번호 (기본값: 1)
   */
  page?: number;

  /**
   * 페이지 크기 (기본값: 20, 최대: 100)
   */
  limit?: number;

  /**
   * 프로젝트 ID 필터
   */
  projectId?: string;
}

@Controller('/pipelines')
export class PipelineController {
  constructor(
    private readonly pipelineService: PipelineService,
    private readonly buildSpecConverterService: BuildSpecConverterService,
  ) {}

  /**
   * @tag pipelines
   * @summary 파이프라인 생성
   */
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.BAD_REQUEST,
    description: '잘못된 요청 데이터',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.NOT_FOUND,
    description: '프로젝트를 찾을 수 없음',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.UNAUTHORIZED,
    description: '인증 실패',
  })
  @HttpCode(HttpStatus.CREATED)
  @AuthGuard()
  @TypedRoute.Post()
  async create(
    @TypedBody() createPipelineDto: CreatePipelineRequestDto,
    @Req() req: IRequestType,
  ): Promise<PipelineResponseDto> {
    return this.pipelineService.create(req.user.user_id, createPipelineDto);
  }

  /**
   * @tag pipelines
   * @summary 파이프라인 목록 조회
   */
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.UNAUTHORIZED,
    description: '인증 실패',
  })
  @HttpCode(HttpStatus.OK)
  @AuthGuard()
  @TypedRoute.Get()
  async findAll(
    @TypedQuery() query: PipelineQueryParams,
    @Req() req: IRequestType,
  ): Promise<PipelineListResponseDto> {
    const { page = 1, limit = 20, projectId } = query;
    const sanitizedLimit = Math.min(Math.max(1, limit), 100); // 1-100 사이로 제한
    const sanitizedPage = Math.max(1, page);

    return this.pipelineService.findAllByUser(
      req.user.user_id,
      sanitizedPage,
      sanitizedLimit,
      projectId,
    );
  }

  /**
   * @tag pipelines
   * @summary 파이프라인 상세 조회
   */
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.NOT_FOUND,
    description: '파이프라인을 찾을 수 없음',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.UNAUTHORIZED,
    description: '인증 실패',
  })
  @HttpCode(HttpStatus.OK)
  @AuthGuard()
  @TypedRoute.Get(':pipelineId')
  async findOne(
    @TypedParam('pipelineId') pipelineId: string,
    @Req() req: IRequestType,
  ): Promise<PipelineDetailResponseDto> {
    return this.pipelineService.findOne(req.user.user_id, pipelineId);
  }

  /**
   * @tag pipelines
   * @summary 파이프라인 수정
   */
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.BAD_REQUEST,
    description: '잘못된 요청 데이터',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.NOT_FOUND,
    description: '파이프라인을 찾을 수 없음',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.UNAUTHORIZED,
    description: '인증 실패',
  })
  @HttpCode(HttpStatus.OK)
  @AuthGuard()
  @TypedRoute.Put(':pipelineId')
  async update(
    @TypedParam('pipelineId') pipelineId: string,
    @TypedBody() updatePipelineDto: UpdatePipelineRequestDto,
    @Req() req: IRequestType,
  ): Promise<PipelineResponseDto> {
    return this.pipelineService.update(
      req.user.user_id,
      pipelineId,
      updatePipelineDto,
    );
  }

  /**
   * @tag pipelines
   * @summary 파이프라인 삭제 (소프트 삭제)
   */
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.NOT_FOUND,
    description: '파이프라인을 찾을 수 없음',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.BAD_REQUEST,
    description: '실행 중인 파이프라인은 삭제할 수 없음',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.UNAUTHORIZED,
    description: '인증 실패',
  })
  @HttpCode(HttpStatus.OK)
  @AuthGuard()
  @TypedRoute.Delete(':pipelineId')
  async remove(
    @TypedParam('pipelineId') pipelineId: string,
    @Req() req: IRequestType,
  ): Promise<{ message: string }> {
    return this.pipelineService.remove(req.user.user_id, pipelineId);
  }

  /**
   * @tag pipelines
   * @summary 파이프라인 활성화/비활성화 토글
   */
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.NOT_FOUND,
    description: '파이프라인을 찾을 수 없음',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.UNAUTHORIZED,
    description: '인증 실패',
  })
  @HttpCode(HttpStatus.OK)
  @AuthGuard()
  @TypedRoute.Patch(':pipelineId/toggle')
  async toggleActive(
    @TypedParam('pipelineId') pipelineId: string,
    @Req() req: IRequestType,
  ): Promise<PipelineResponseDto> {
    return this.pipelineService.toggleActive(req.user.user_id, pipelineId);
  }

  /**
   * @tag pipelines
   * @summary 프로젝트의 파이프라인 개수 조회
   */
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.NOT_FOUND,
    description: '프로젝트를 찾을 수 없음',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.UNAUTHORIZED,
    description: '인증 실패',
  })
  @HttpCode(HttpStatus.OK)
  @AuthGuard()
  @TypedRoute.Get('/count/:projectId')
  async countByProject(
    @TypedParam('projectId') projectId: string,
    @Req() req: IRequestType,
  ): Promise<{ count: number }> {
    const count = await this.pipelineService.countByProject(
      req.user.user_id,
      projectId,
    );
    return { count };
  }

  /**
   * @tag pipelines
   * @summary JSON 파이프라인 데이터를 buildspec.yaml로 변환
   */
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.BAD_REQUEST,
    description: '잘못된 파이프라인 데이터',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.UNAUTHORIZED,
    description: '인증 실패',
  })
  @HttpCode(HttpStatus.OK)
  @AuthGuard()
  @TypedRoute.Post('/convert/json-to-buildspec')
  convertJsonToBuildSpec(
    @TypedBody() request: JsonToBuildSpecRequestDto,
  ): JsonToBuildSpecResponseDto {
    const buildSpecYaml = this.buildSpecConverterService.convertToBuildSpec(
      request.pipelineData,
    );

    return {
      buildSpecYaml,
      success: true,
      nodesProcessed: request.pipelineData.nodes?.length || 0,
    };
  }

  /**
   * @tag pipelines
   * @summary buildspec.yaml을 JSON 파이프라인 데이터로 변환
   */
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.BAD_REQUEST,
    description: '유효하지 않은 buildspec.yaml',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.UNAUTHORIZED,
    description: '인증 실패',
  })
  @HttpCode(HttpStatus.OK)
  @AuthGuard()
  @TypedRoute.Post('/convert/buildspec-to-json')
  convertBuildSpecToJson(
    @TypedBody() request: BuildSpecToJsonRequestDto,
  ): BuildSpecToJsonResponseDto {
    const pipelineData = this.buildSpecConverterService.convertFromBuildSpec(
      request.buildSpecYaml,
    );

    return {
      pipelineData,
      success: true,
      nodesGenerated: pipelineData.nodes?.length || 0,
    };
  }
}

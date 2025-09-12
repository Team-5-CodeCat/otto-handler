import { Controller, HttpStatus, Req } from '@nestjs/common';
import {
  TypedBody,
  TypedException,
  TypedParam,
  TypedRoute,
} from '@nestia/core';
import { AuthGuard } from '../../common/decorators';
import type { IRequestType } from '../../common/type';
import type { CommonErrorResponseDto } from '../../common/dto';

import { CodeBuildService } from '../services/codebuild.service';
import type { CreateProjectRequestDto } from '../dtos/request/create-project-request.dto';
import type { StartBuildRequestDto } from '../dtos/request/start-build-request.dto';
import type { CreateProjectResponseDto } from '../dtos/response/create-project-response.dto';
import type { BuildResponseDto } from '../dtos/response/build-response.dto';
import type { BuildStatusResponseDto } from '../dtos/response/build-status-response.dto';

@Controller('codebuild')
export class CodeBuildController {
  constructor(private readonly codeBuildService: CodeBuildService) {}

  /**
   * @tag codebuild
   * @summary CodeBuild 프로젝트 생성
   * @description GitHub Repository당 하나의 CodeBuild 프로젝트를 생성합니다.
   */
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.UNAUTHORIZED,
    description: '로그인 필요',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.FORBIDDEN,
    description: '권한 없음',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.BAD_REQUEST,
    description: '잘못된 요청 또는 AWS 에러',
  })
  @AuthGuard()
  @TypedRoute.Post('projects')
  async codebuildCreateProject(
    @TypedBody() createDto: CreateProjectRequestDto,
    @Req() req: IRequestType,
  ): Promise<CreateProjectResponseDto> {
    // JWT에서 사용자 ID 추출하여 요청에 설정
    const userId = req.user.user_id;
    const requestWithUserId = { ...createDto, userId };

    return this.codeBuildService.createProject(requestWithUserId);
  }

  /**
   * @tag codebuild
   * @summary 파이프라인 빌드 시작
   * @description 환경변수 오버라이드를 활용하여 파이프라인별 독립적 빌드를 시작합니다.
   */
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.UNAUTHORIZED,
    description: '로그인 필요',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.FORBIDDEN,
    description: '권한 없음',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.BAD_REQUEST,
    description: '잘못된 요청 또는 빌드 시작 실패',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.NOT_FOUND,
    description: 'CodeBuild 프로젝트를 찾을 수 없음',
  })
  @AuthGuard()
  @TypedRoute.Post('builds')
  async codebuildStartBuild(
    @TypedBody() buildDto: StartBuildRequestDto,
  ): Promise<BuildResponseDto> {
    return this.codeBuildService.startBuild(buildDto);
  }

  /**
   * @tag codebuild
   * @summary 빌드 상태 조회
   * @description 빌드 ID로 현재 빌드 상태와 진행 상황을 조회합니다.
   */
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.UNAUTHORIZED,
    description: '로그인 필요',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.NOT_FOUND,
    description: '빌드를 찾을 수 없음',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.BAD_REQUEST,
    description: 'AWS API 에러',
  })
  @AuthGuard()
  @TypedRoute.Get('builds/:buildId/status')
  async codebuildGetBuildStatus(
    @TypedParam('buildId') buildId: string,
  ): Promise<BuildStatusResponseDto> {
    return this.codeBuildService.getBuildStatus(buildId);
  }

  /**
   * @tag codebuild
   * @summary 빌드 중단
   * @description 진행 중인 빌드를 중단합니다.
   */
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.UNAUTHORIZED,
    description: '로그인 필요',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.NOT_FOUND,
    description: '빌드를 찾을 수 없음',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.BAD_REQUEST,
    description: '빌드 중단 실패',
  })
  @AuthGuard()
  @TypedRoute.Post('builds/:buildId/stop')
  async codebuildStopBuild(
    @TypedParam('buildId') buildId: string,
  ): Promise<{ buildId: string; status: string; message: string }> {
    const result = await this.codeBuildService.stopBuild(buildId);
    return {
      ...result,
      message: '빌드가 중단되었습니다',
    };
  }

  /**
   * @tag codebuild
   * @summary 프로젝트의 최근 빌드 목록 조회
   * @description 특정 CodeBuild 프로젝트의 최근 빌드 목록을 조회합니다.
   */
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.UNAUTHORIZED,
    description: '로그인 필요',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.NOT_FOUND,
    description: '프로젝트를 찾을 수 없음',
  })
  @AuthGuard()
  @TypedRoute.Get('projects/:projectName/builds')
  async codebuildGetProjectBuilds(
    @TypedParam('projectName') projectName: string,
  ): Promise<{ projectName: string; buildIds: string[] }> {
    const buildIds = await this.codeBuildService.getBuildsForProject(
      projectName,
      20,
    );
    return {
      projectName,
      buildIds,
    };
  }
}

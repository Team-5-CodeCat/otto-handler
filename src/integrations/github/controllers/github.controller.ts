import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { TypedBody, TypedException, TypedRoute, TypedQuery } from '@nestia/core';
import { AuthGuard } from '@common/guards/auth.guard';
import { GithubService } from '../services/github.service';
import type {
  RegisterGithubAppDto,
  SelectRepositoryDto,
  SelectBranchDto,
} from '../dtos';
import type {
  GithubAppRegisterResponseDto,
  BranchInfoResponseDto,
  SelectRepositoryResponseDto,
  SelectBranchResponseDto,
} from '../dtos';
import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * GitHub 통합 컨트롤러
 * - GitHub 계정 등록 및 관리
 * - 레포지토리 및 브랜치 선택
 * - 프로젝트와 GitHub 리소스 연결
 */
@Controller('integrations/github')
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  /**
   * GitHub App 설치 URL 조회
   * - 프론트엔드에서 GitHub App 설치 페이지로 리다이렉트할 URL 제공
   */
  @TypedRoute.Get('/install/url')
  getInstallationUrl(): { url: string } {
    const githubAppId = process.env.GITHUB_APP_ID;
    if (!githubAppId) {
      throw new HttpException('GitHub App ID가 설정되지 않았습니다.', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return {
      url: `https://github.com/apps/otto-test-1/installations/new?app_id=${githubAppId}`,
    };
  }

  /**
   * 1단계: GitHub 계정 등록
   * - GitHub App 설치 후 받은 installationId와 accessToken으로 계정 등록
   * - 등록된 계정의 접근 가능한 레포지토리 목록 반환
   */
  @UseGuards(AuthGuard)
  @TypedException<HttpException>({
    status: HttpStatus.UNAUTHORIZED,
    description: 'GitHub 인증 실패',
  })
  @TypedException<HttpException>({
    status: HttpStatus.BAD_REQUEST,
    description: '잘못된 요청',
  })
  @TypedRoute.Post('/register')
  async registerGithubApp(
    @Req() req: any,
    @TypedBody() body: RegisterGithubAppDto,
  ): Promise<GithubAppRegisterResponseDto> {
    return this.githubService.registerGithubApp(req.user, body);
  }

  /**
   * 2단계: 레포지토리 목록 조회
   * - 사용자의 등록된 모든 GitHub 계정에서 접근 가능한 레포지토리 목록 조회
   */
  @UseGuards(AuthGuard)
  @TypedException<HttpException>({
    status: HttpStatus.UNAUTHORIZED,
    description: 'GitHub 계정이 등록되지 않음',
  })
  @TypedException<HttpException>({
    status: HttpStatus.BAD_REQUEST,
    description: '레포지토리 목록 조회 실패',
  })
  @TypedRoute.Get('/repositories')
  async getRepositories(
    @Req() req: any,
  ): Promise<GithubAppRegisterResponseDto> {
    return this.githubService.getRepositories(req.user);
  }

  /**
   * 3단계: 레포지토리 선택
   * - 사용자가 선택한 레포지토리를 프로젝트에 연결
   * - ProjectRepository 테이블에 프로젝트-레포-계정 연결 정보 저장
   */
  @UseGuards(AuthGuard)
  @TypedException<HttpException>({
    status: HttpStatus.NOT_FOUND,
    description: '프로젝트 또는 레포지토리를 찾을 수 없음',
  })
  @TypedException<HttpException>({
    status: HttpStatus.UNAUTHORIZED,
    description: 'GitHub 설치 정보가 유효하지 않음',
  })
  @TypedException<HttpException>({
    status: HttpStatus.BAD_REQUEST,
    description: '레포지토리 선택 실패',
  })
  @TypedRoute.Post('/repositories/select')
  async selectRepository(
    @Req() req: any,
    @TypedBody() body: SelectRepositoryDto,
  ): Promise<SelectRepositoryResponseDto> {
    return this.githubService.selectRepository(req.user, body);
  }

  /**
   * 4단계: 브랜치 목록 조회
   * - 선택된 레포지토리의 브랜치 목록 조회
   * - 해당 레포지토리에 접근 권한이 있는 GitHub 계정을 사용
   */
  @UseGuards(AuthGuard)
  @TypedException<HttpException>({
    status: HttpStatus.NOT_FOUND,
    description: '레포지토리를 찾을 수 없음',
  })
  @TypedException<HttpException>({
    status: HttpStatus.UNAUTHORIZED,
    description: '레포지토리에 접근할 수 있는 GitHub 계정이 없음',
  })
  @TypedException<HttpException>({
    status: HttpStatus.BAD_REQUEST,
    description: '브랜치 목록 조회 실패',
  })
  @TypedRoute.Get('/branches')
  async getBranches(
    @Req() req: any,
    @TypedQuery() query: { repo: string },
  ): Promise<BranchInfoResponseDto> {
    return this.githubService.getBranches(req.user, query.repo);
  }

  /**
   * 5단계: 브랜치 선택
   * - 선택된 브랜치를 ProjectRepository.selectedBranch에 저장
   */
  @UseGuards(AuthGuard)
  @TypedException<HttpException>({
    status: HttpStatus.NOT_FOUND,
    description: '프로젝트-레포지토리 연결 또는 브랜치를 찾을 수 없음',
  })
  @TypedException<HttpException>({
    status: HttpStatus.BAD_REQUEST,
    description: '브랜치 선택 실패',
  })
  @TypedRoute.Post('/branches/select')
  async selectBranch(
    @Req() req: any,
    @TypedBody() body: SelectBranchDto,
  ): Promise<SelectBranchResponseDto> {
    return this.githubService.selectBranch(req.user, body);
  }

  /**
   * GitHub App 설치 콜백
   * - GitHub App 설치 완료 후 리다이렉트되는 페이지
   * - 프론트엔드에서 설치 정보를 받아서 /register API 호출
   */
  @TypedRoute.Get('/install/callback')
  installationCallback(
    @TypedQuery() query: { installation_id: string; setup_action: string },
  ): { message: string; installationId: string; nextStep: string } {
    return {
      message: 'GitHub App 설치가 완료되었습니다.',
      installationId: query.installation_id,
      nextStep: '이제 GitHub 계정을 등록해주세요.',
    };
  }

  /**
   * GitHub Webhook 이벤트 처리
   * - GitHub에서 발생하는 이벤트를 받아서 처리
   * - 설치/제거 이벤트, 푸시 이벤트 등 처리
   */
  @TypedRoute.Post('/webhook')
  async handleWebhook(
    @Req() req: any,
    @Body() body: any,
  ): Promise<{ received: boolean }> {
    // TODO: GitHub Webhook 시크릿 검증
    // TODO: 이벤트 타입별 처리 로직 구현
    
    return { received: true };
  }
}

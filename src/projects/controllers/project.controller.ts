import { ProjectService } from '../services/project.service';
import { GithubService } from '../services/github.service';
import {
  TypedBody,
  TypedException,
  TypedParam,
  TypedRoute,
} from '@nestia/core';
import type {
  CreateProjectRequestDto,
  CreateProjectWithGithubDto,
  RegisterInstallationRequestDto,
  ConnectRepositoryRequestDto,
  UpdateBranchRequestDto,
  CreateProjectResponseDto,
  CreateProjectWithGithubResponseDto,
  RegisterInstallationResponseDto,
  GetRepositoriesResponseDto,
  ConnectRepositoryResponseDto,
  GetBranchesResponseDto,
  UpdateBranchResponseDto,
  GithubInstallUrlResponseDto,
  GithubStatusResponseDto,
} from '../dtos';
import {
  Controller,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Req,
  HttpStatus,
  Query,
  Redirect,
} from '@nestjs/common';
import { tags } from 'typia';
import { AuthGuard } from '../../common/decorators';
import type { IRequestType } from '../../common/type';
import { CommonErrorResponseDto } from '../../common/dto/response/common-error-response.dto';
import { GetUserGithubInstallationsResponseDto } from '../dtos/response/get-user-github-installations-response.dto';
import { GetProjectDetailResponseDto } from '../dtos/response/get-project-detail-response.dto';
import { GetUserProjectsResponseDto } from '../dtos/response/get-user-projects-response.dto';

@Controller('projects')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly githubService: GithubService,
  ) {}

  /**
   * @tag project
   * @summary 새 프로젝트 생성
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
    description: '잘못된 요청',
  })
  @AuthGuard()
  @TypedRoute.Post()
  async projectCreateProject(
    @TypedBody() createProjectDto: CreateProjectRequestDto,
    @Req() req: IRequestType,
  ): Promise<CreateProjectResponseDto> {
    const userId = req.user.user_id; // JWT 토큰에서 사용자 ID 추출

    return this.projectService.createProject(
      userId,
      createProjectDto.name,
      createProjectDto.webhookUrl,
    );
  }

  /**
   * @tag project
   * @summary GitHub app 설치 등록
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
    description: '잘못된 요청',
  })
  @AuthGuard()
  @TypedRoute.Post('github-installations')
  async projectRegisterGithubInstallation(
    @TypedBody() registerDto: RegisterInstallationRequestDto,
    @Req() req: IRequestType,
  ): Promise<RegisterInstallationResponseDto> {
    const userId = req.user.user_id;

    return this.projectService.registerGithubInstallation(
      userId,
      registerDto.installationId,
    );
  }

  /**
   * @tag project
   * @summary GitHub 설치 목록 조회 (사용자가 등록한 모든 GitHub 계정)
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
    description: '잘못된 요청',
  })
  @AuthGuard()
  @TypedRoute.Get('github-installations')
  async projectGetUserGithubInstallations(
    @Req() req: IRequestType,
  ): Promise<GetUserGithubInstallationsResponseDto> {
    const userId = req.user.user_id;

    return this.projectService.getUserGithubInstallations(userId);
  }

  /**
   * @tag project
   * @summary 특정 설치에서 접근 가능한 레포지토리 목록 조회
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
    description: '잘못된 요청',
  })
  @AuthGuard()
  @TypedRoute.Get('github-installations/:installationId/repositories')
  async projectGetAvailableRepositories(
    @TypedParam('installationId') installationId: string & tags.Format<'uuid'>,
    @Req() req: IRequestType,
  ): Promise<GetRepositoriesResponseDto> {
    const userId = req.user.user_id;

    // 보안 검증: 이 설치가 현재 사용자 소유인지 확인
    const installations =
      await this.projectService.getUserGithubInstallations(userId);
    const hasAccess = installations.some(
      (install) => install.id === installationId,
    );

    if (!hasAccess) {
      throw new ForbiddenException('해당 GitHub 설치에 접근할 권한이 없습니다');
    }

    // UUID로 실제 GitHub Installation ID 찾기
    const installation = installations.find(
      (install) => install.id === installationId,
    );

    if (!installation) {
      throw new ForbiddenException('해당 GitHub 설치를 찾을 수 없습니다');
    }

    return this.githubService.getAccessibleRepositories(
      installation.installationId,
    );
  }

  /**
   * @tag project
   * @summary GitHub Installation의 특정 레포지토리 브랜치 목록 조회
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
    description: '잘못된 요청',
  })
  @AuthGuard()
  @TypedRoute.Get(
    'github-installations/:installationId/repositories/:repoFullName/branches',
  )
  async getRepositoryBranchesFromInstallation(
    @TypedParam('installationId') installationId: string & tags.Format<'uuid'>,
    @TypedParam('repoFullName') repoFullName: string,
    @Req() req: IRequestType,
  ): Promise<GetBranchesResponseDto> {
    const userId = req.user.user_id;

    // 보안 검증: 이 설치가 현재 사용자 소유인지 확인
    const installations =
      await this.projectService.getUserGithubInstallations(userId);
    const hasAccess = installations.some(
      (install) => install.id === installationId,
    );

    if (!hasAccess) {
      throw new ForbiddenException('해당 GitHub 설치에 접근할 권한이 없습니다');
    }

    // UUID로 실제 GitHub Installation ID 찾기
    const installation = installations.find(
      (install) => install.id === installationId,
    );

    if (!installation) {
      throw new ForbiddenException('해당 GitHub 설치를 찾을 수 없습니다');
    }

    // repoFullName을 URL 디코딩 (예: "owner%2Frepo" -> "owner/repo")
    const decodedRepoFullName = decodeURIComponent(repoFullName);

    return this.githubService.getRepositoryBranches(
      installation.installationId,
      decodedRepoFullName,
    );
  }

  /**
   * @tag project
   * @summary 프로젝트에 레포지토리 연결
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
    description: '잘못된 요청',
  })
  @AuthGuard()
  @TypedRoute.Post(':projectId/repositories')
  async projectConnectRepository(
    @TypedParam('projectId') projectId: string & tags.Format<'uuid'>,
    @TypedBody() connectDto: ConnectRepositoryRequestDto,
    @Req() req: IRequestType,
  ): Promise<ConnectRepositoryResponseDto> {
    const userId = req.user.user_id;

    return this.projectService.connectRepositoryToProject(
      userId,
      projectId,
      connectDto.repoFullName,
      connectDto.selectedBranch,
      connectDto.installationId,
    );
  }

  /**
   * @tag project
   * @summary 레포지토리의 브랜치 목록 조회
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
    description: '잘못된 요청',
  })
  @AuthGuard()
  @TypedRoute.Get(':projectId/repositories/:repositoryId/branches')
  async projectGetRepositoryBranches(
    @TypedParam('projectId') projectId: string & tags.Format<'uuid'>,
    @TypedParam('repositoryId') repositoryId: string & tags.Format<'uuid'>,
    @Req() req: IRequestType,
  ): Promise<GetBranchesResponseDto> {
    const userId = req.user.user_id;

    // 먼저 이 레포지토리가 사용자의 프로젝트에 속하는지 확인
    const project = await this.projectService.getProjectDetail(
      userId,
      projectId,
    );
    const repository = project.repositories.find(
      (repo) => repo.id === repositoryId,
    );

    if (!repository) {
      throw new NotFoundException('레포지토리를 찾을 수 없습니다');
    }

    if (!repository.installationId) {
      throw new BadRequestException(
        '이 레포지토리에는 GitHub 설치 정보가 없습니다',
      );
    }

    return this.githubService.getRepositoryBranches(
      repository.installationId,
      repository.repoFullName,
    );
  }

  /**
   * @tag project
   * @summary 선택된 브랜치 변경
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
    description: '잘못된 요청',
  })
  @AuthGuard()
  @TypedRoute.Patch(':projectId/repositories/:repositoryId/branch')
  async projectUpdateSelectedBranch(
    @TypedParam('projectId') projectId: string & tags.Format<'uuid'>,
    @TypedParam('repositoryId') repositoryId: string & tags.Format<'uuid'>,
    @TypedBody() updateDto: UpdateBranchRequestDto,
    @Req() req: IRequestType,
  ): Promise<UpdateBranchResponseDto> {
    const userId = req.user.user_id;

    return this.projectService.updateSelectedBranch(
      userId,
      projectId,
      repositoryId,
      updateDto.branchName,
    );
  }

  /**
   * @tag project
   * @summary 프로젝트 상세 정보 조회 (연결된 레포지토리들과 함께)
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
    description: '잘못된 요청',
  })
  @AuthGuard()
  @TypedRoute.Get(':projectId')
  async projectGetProjectDetail(
    @TypedParam('projectId') projectId: string & tags.Format<'uuid'>,
    @Req() req: IRequestType,
  ): Promise<GetProjectDetailResponseDto> {
    const userId = req.user.user_id;

    return this.projectService.getProjectDetail(userId, projectId);
  }

  /**
   * @tag project
   * @summary GitHub App 설치 URL 생성
   */
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.UNAUTHORIZED,
    description: '로그인 필요',
  })
  @AuthGuard()
  @TypedRoute.Get('github/install-url')
  getGithubInstallUrl(@Req() req: IRequestType): GithubInstallUrlResponseDto {
    const userId = req.user.user_id;

    console.log('[GitHub Install URL] Generating for user:', userId);

    const state = this.projectService.generateGithubInstallState(userId);
    const appSlug = process.env.GITHUB_APP_NAME || 'otto-test-1';
    const baseUrl = 'https://github.com/apps';
    const installUrl = `${baseUrl}/${appSlug}/installations/new?state=${encodeURIComponent(
      state,
    )}`;

    console.log('[GitHub Install URL] Generated:', {
      userId,
      appSlug,
      state: `${state.substring(0, 20)}...`,
      installUrl: `${baseUrl}/${appSlug}/installations/new?state=...`,
    });

    return {
      userId,
      appSlug,
      state,
      installUrl,
    };
  }

  /**
   * @tag project
   * @summary 사용자의 GitHub 설치 상태 확인
   */
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.UNAUTHORIZED,
    description: '로그인 필요',
  })
  @AuthGuard()
  @TypedRoute.Get('github/status')
  async getGithubStatus(
    @Req() req: IRequestType,
  ): Promise<GithubStatusResponseDto> {
    const userId = req.user.user_id;
    const status =
      await this.projectService.getGitHubInstallationStatus(userId);

    return {
      hasInstallation: status.hasInstallations,
      totalInstallations: status.totalInstallations,
      totalConnectedRepositories: status.totalConnectedRepositories,
      installations: status.installations.map((installation) => ({
        id: installation.id,
        installationId: installation.installationId,
        accountLogin: installation.accountLogin || 'Unknown',
        accountId: installation.accountId || 'Unknown',
        connectedRepositories: installation.connectedRepositories,
        installedAt: installation.installedAt,
        lastUsedAt: installation.lastUsedAt,
      })),
    };
  }

  /**
   * @tag project
   * @summary 사용자의 모든 프로젝트 목록 조회
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
    description: '잘못된 요청',
  })
  @AuthGuard()
  @TypedRoute.Get()
  async projectGetUserProjects(
    @Req() req: IRequestType,
  ): Promise<GetUserProjectsResponseDto> {
    const userId = req.user.user_id;

    return this.projectService.getUserProjects(userId);
  }

  /**
   * @tag project
   * @summary GitHub App 설치 콜백 처리 (프론트엔드 리다이렉트)
   */
  @TypedRoute.Get('github/callback')
  @Redirect()
  async handleGithubCallback(
    @Query('installation_id') installationId: string,
    @Query('setup_action') setupAction: string,
    @Query('state') state: string,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const callbackPath = '/integrations/github/callback';

    console.log('[GitHub Callback] Received:', {
      installationId,
      setupAction,
      state: state ? `${state.substring(0, 20)}...` : 'null',
    });

    try {
      // 1) state 검증 및 사용자 식별
      if (!state) {
        console.log('[GitHub Callback] Error: Missing state parameter');
        return {
          url: `${frontendUrl}${callbackPath}?status=error&reason=missing_state`,
          statusCode: 302,
        };
      }

      const userId = this.projectService.parseGithubInstallState(state);
      if (!userId) {
        console.log('[GitHub Callback] Error: Invalid state token');
        return {
          url: `${frontendUrl}${callbackPath}?status=error&reason=invalid_state`,
          statusCode: 302,
        };
      }

      console.log('[GitHub Callback] State verified for user:', userId);

      // 2) installation_id 유효성 확인
      if (!installationId) {
        console.log('[GitHub Callback] Error: Missing installation_id');
        return {
          url: `${frontendUrl}${callbackPath}?status=error&reason=missing_installation_id`,
          statusCode: 302,
        };
      }

      // installation_id를 string으로 확실히 변환
      const installationIdStr = String(installationId);
      console.log(
        '[GitHub Callback] Processing installation:',
        installationIdStr,
      );

      // setup_action 참고: install/update
      void setupAction;

      // 3) 사용자와 설치 연결 (검증 및 upsert)
      const installation = await this.projectService.linkInstallationToUser(
        userId,
        installationIdStr,
      );

      console.log('[GitHub Callback] Installation saved successfully:', {
        userId,
        installationId: installation.installationId,
        accountLogin: installation.accountLogin,
        dbId: installation.id,
      });

      // 4) 프론트엔드 콜백 페이지로 리다이렉트
      const successUrl = `${frontendUrl}${callbackPath}?status=success&installation_id=${encodeURIComponent(
        installationIdStr,
      )}&account_login=${encodeURIComponent(installation.accountLogin || '')}`;

      console.log('[GitHub Callback] Redirecting to:', successUrl);

      return {
        url: successUrl,
        statusCode: 302,
      };
    } catch (error) {
      // 5) 예외 처리 및 에러 리다이렉트
      console.error('[GitHub Callback] Error occurred:', error);

      // 에러 타입별 세분화
      let reason = 'installation_failed';
      if (error instanceof Error) {
        if (error.message.includes('유효하지 않은')) {
          reason = 'invalid_installation';
        } else if (error.message.includes('권한')) {
          reason = 'permission_denied';
        }
      }

      return {
        url: `${frontendUrl}${callbackPath}?status=error&reason=${reason}`,
        statusCode: 302,
      };
    }
  }

  /**
   * @tag project
   * @summary GitHub 연동 프로젝트 생성 (원스톱)
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
    description: '잘못된 요청',
  })
  @AuthGuard()
  @TypedRoute.Post('with-github')
  async createProjectWithGithub(
    @TypedBody() createDto: CreateProjectWithGithubDto,
    @Req() req: IRequestType,
  ): Promise<CreateProjectWithGithubResponseDto> {
    const userId = req.user.user_id;

    console.log('[Project Controller] Creating GitHub project:', {
      userId,
      name: createDto.name,
      repository: createDto.repositoryFullName,
      installationId: createDto.installationId,
      selectedBranch: createDto.selectedBranch,
    });

    return this.projectService.createProjectWithGithub(userId, createDto);
  }
}

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
import { Project, User } from '@prisma/client';
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
   * 프로젝트가 사용자 정보를 포함하는지 확인하는 타입 가드
   */
  private hasUserInfo(
    project: unknown,
  ): project is Project & { user: User & { username?: string } } {
    if (!project || typeof project !== 'object' || project === null) {
      return false;
    }

    const proj = project as Record<string, unknown>;
    return (
      'user' in proj && proj.user !== null && typeof proj.user === 'object'
    );
  }

  /**
   * 에러 정보를 안전하게 추출하는 헬퍼 메서드
   */
  private getErrorInfo(error: unknown): {
    message: string;
    name: string;
    stack?: string;
  } {
    if (error instanceof Error) {
      return {
        message: error.message,
        name: error.name,
        stack: error.stack?.substring(0, 500),
      };
    }
    return {
      message: 'Unknown error',
      name: 'UnknownError',
    };
  }

  /**
   * 객체가 특정 속성을 가지고 있는지 확인하는 타입 가드
   */
  private hasProperty<T extends string>(
    obj: unknown,
    prop: T,
  ): obj is Record<T, unknown> {
    return typeof obj === 'object' && obj !== null && prop in obj;
  }

  /**
   * 안전한 문자열 변환 헬퍼 메서드
   */
  private safeStringify(value: unknown): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return '[object Object]';
      }
    }
    // primitive 타입이 아닌 경우 안전하게 처리
    if (typeof value === 'function') {
      return '[Function]';
    }
    if (typeof value === 'symbol') {
      return value.toString();
    }
    // 기타 모든 경우
    return '[unknown]';
  }

  /**
   * GitHub Installation 객체 타입 가드
   */
  private isGithubInstallation(obj: unknown): obj is {
    installationId: string;
    userId: string;
    githubInstallationId: string;
    accountLogin: string;
    accountId: string;
    accountType: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  } {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'installationId' in obj &&
      'userId' in obj &&
      'githubInstallationId' in obj &&
      'accountLogin' in obj &&
      'accountId' in obj &&
      'accountType' in obj &&
      'isActive' in obj &&
      'createdAt' in obj &&
      'updatedAt' in obj &&
      typeof (obj as Record<string, unknown>).installationId === 'string' &&
      typeof (obj as Record<string, unknown>).userId === 'string' &&
      typeof (obj as Record<string, unknown>).githubInstallationId ===
        'string' &&
      typeof (obj as Record<string, unknown>).accountLogin === 'string' &&
      typeof (obj as Record<string, unknown>).accountId === 'string' &&
      typeof (obj as Record<string, unknown>).accountType === 'string' &&
      typeof (obj as Record<string, unknown>).isActive === 'boolean' &&
      (obj as Record<string, unknown>).createdAt instanceof Date &&
      (obj as Record<string, unknown>).updatedAt instanceof Date
    );
  }

  /**
   * GitHub Installation 배열 타입 가드
   */
  private isGithubInstallationArray(obj: unknown): obj is Array<{
    installationId: string;
    userId: string;
    githubInstallationId: string;
    accountLogin: string;
    accountId: string;
    accountType: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }> {
    return (
      Array.isArray(obj) && obj.every((item) => this.isGithubInstallation(item))
    );
  }

  /**
   * Project 객체 타입 가드
   */
  private isProject(obj: unknown): obj is {
    projectId: string;
    userId: string;
    name: string;
    description?: string | null;
    githubRepoId: string;
    githubRepoUrl: string;
    githubRepoName: string;
    githubOwner: string;
    isPrivate: boolean;
    selectedBranch: string;
    isActive: boolean;
    installationId?: string | null;
    createdAt: Date;
    updatedAt: Date;
    user: {
      userId: string;
      email: string;
      name: string | null;
    };
  } {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'projectId' in obj &&
      'userId' in obj &&
      'name' in obj &&
      'user' in obj &&
      typeof (obj as Record<string, unknown>).projectId === 'string' &&
      typeof (obj as Record<string, unknown>).userId === 'string' &&
      typeof (obj as Record<string, unknown>).name === 'string' &&
      typeof (obj as Record<string, unknown>).user === 'object' &&
      (obj as Record<string, unknown>).user !== null
    );
  }

  /**
   * Project 배열 타입 가드
   */
  private isProjectArray(obj: unknown): obj is Array<{
    projectId: string;
    userId: string;
    name: string;
    description?: string | null;
    githubRepoId: string;
    githubRepoUrl: string;
    githubRepoName: string;
    githubOwner: string;
    isPrivate: boolean;
    selectedBranch: string;
    isActive: boolean;
    installationId?: string | null;
    createdAt: Date;
    updatedAt: Date;
    user: {
      userId: string;
      email: string;
      name: string | null;
    };
  }> {
    return Array.isArray(obj) && obj.every((item) => this.isProject(item));
  }

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

    const project = (await this.projectService.createProject(
      userId,
      createProjectDto.name,
      createProjectDto.webhookUrl,
    )) as Project & { user?: User & { username?: string } };

    // DTO 필드명 매핑 (projectId → projectID, userId → userID)
    return {
      projectId: project.projectId,
      name: project.name,
      webhookUrl: null, // webhookUrl 필드가 없으므로 null
      user: {
        userId: project.user?.userId || userId,
        email: `${project.user?.username || 'user'}@github.user`, // GitHub 사용자는 가상 이메일 사용
        name: project.user?.username || 'User', // username을 name으로 사용
      },
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
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

    const installation = await this.projectService.registerGithubInstallation(
      userId,
      registerDto.installationId,
    );

    // DTO 필드명 매핑
    return {
      installationId: installation.installationId,
      userId: installation.userId,
      githubInstallationId: installation.githubInstallationId,
      accountLogin: installation.accountLogin,
      accountId: String(installation.accountId),
      accountType: installation.accountType,
      isActive: installation.isActive,
      createdAt: installation.createdAt,
      updatedAt: installation.updatedAt,
      user: {
        userId: installation.userId,
        email: '', // 이 메서드는 user 정보를 포함하지 않음
        name: '',
      },
    };
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

    const installations =
      await this.projectService.getUserGithubInstallations(userId);

    // 타입 가드로 안전하게 처리
    if (!this.isGithubInstallationArray(installations)) {
      console.error(
        '[Project Controller] Invalid installations data:',
        installations,
      );
      return [];
    }

    // DTO 필드명 매핑
    return installations.map((inst) => ({
      installationId: inst.installationId,
      userId: inst.userId,
      githubInstallationId: inst.githubInstallationId,
      accountLogin: inst.accountLogin,
      accountId: inst.accountId,
      accountType: inst.accountType,
      isActive: inst.isActive,
      createdAt: inst.createdAt,
      updatedAt: inst.updatedAt,
    }));
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
    @TypedParam('installationId') installationId: string,
    @Req() req: IRequestType,
  ): Promise<GetRepositoriesResponseDto> {
    const userId = req.user.user_id;

    console.log('[Repositories API] Request received:', {
      userId,
      installationId,
      paramType: typeof installationId,
      rawParams: req.params,
      rawQuery: req.query,
      headers: {
        'user-agent': req.headers['user-agent'],
        authorization: req.headers.authorization ? 'Bearer [TOKEN]' : 'none',
      },
    });

    try {
      // 보안 검증: 이 설치가 현재 사용자 소유인지 확인

      const installations =
        await this.projectService.getUserGithubInstallations(userId);

      // 타입 가드로 안전하게 처리
      if (!this.isGithubInstallationArray(installations)) {
        console.error(
          '[Repositories API] Invalid installations data:',
          installations,
        );
        throw new ForbiddenException('GitHub 설치 정보를 가져올 수 없습니다');
      }

      console.log('[Repositories API] User installations found:', {
        userId,
        totalInstallations: installations.length,
        // installation 객체의 필드들을 안전하게 변환하여 할당
        installationIds: installations.map((install) => ({
          installationId: this.safeStringify(install.installationId),
          githubInstallationId: this.safeStringify(
            install.githubInstallationId,
          ),
          accountLogin: this.safeStringify(install.accountLogin),
        })),
      });

      const hasAccess = installations.some(
        (install) => install.githubInstallationId === installationId,
      );

      if (!hasAccess) {
        console.log('[Repositories API] Access denied:', {
          userId,
          requestedInstallationId: installationId,
          availableInstallations: installations.map((i) =>
            this.safeStringify(i.installationId),
          ),
        });
        throw new ForbiddenException(
          '해당 GitHub 설치에 접근할 권한이 없습니다',
        );
      }

      // UUID로 실제 GitHub Installation ID 찾기
      const installation = installations.find(
        (install) => install.githubInstallationId === installationId,
      );

      if (!installation) {
        console.log('[Repositories API] Installation not found:', {
          userId,
          requestedInstallationId: installationId,
          availableInstallations: installations.map((i) =>
            this.safeStringify(i.installationId),
          ),
        });
        throw new ForbiddenException('해당 GitHub 설치를 찾을 수 없습니다');
      }

      console.log('[Repositories API] Fetching repositories:', {
        userId,
        // installation 객체의 필드들을 안전하게 변환하여 할당
        installationId: this.safeStringify(installation.installationId),
        githubInstallationId: this.safeStringify(
          installation.githubInstallationId,
        ),
        accountLogin: this.safeStringify(installation.accountLogin),
      });

      // githubInstallationId를 안전한 문자열로 변환하여 전달
      const repositories = await this.githubService.getAccessibleRepositories(
        this.safeStringify(installation.githubInstallationId),
      );

      console.log('[Repositories API] Success:', {
        userId,
        installationId,
        repositoryCount: repositories.length,
        repositories: repositories.slice(0, 3).map((r) => ({
          name: r.name,
          fullName: r.fullName,
        })),
      });

      return repositories;
    } catch (error: unknown) {
      // error 객체를 타입 안전하게 처리
      const errorInfo = this.getErrorInfo(error);
      console.error('[Repositories API] Error occurred:', {
        userId,
        installationId,
        error: errorInfo,
        // 생성자 이름을 안전하게 추출
        errorType: error instanceof Error ? error.constructor.name : 'unknown',
      });

      // 에러를 다시 던져서 NestJS가 적절한 HTTP 응답을 생성하도록 함
      throw error;
    }
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
    @TypedParam('installationId') installationId: string,
    @TypedParam('repoFullName') repoFullName: string,
    @Req() req: IRequestType,
  ): Promise<GetBranchesResponseDto> {
    const userId = req.user.user_id;

    // 보안 검증: 이 설치가 현재 사용자 소유인지 확인
    const installations =
      await this.projectService.getUserGithubInstallations(userId);

    // 타입 가드로 안전하게 처리
    if (!this.isGithubInstallationArray(installations)) {
      console.error(
        '[Branches API] Invalid installations data:',
        installations,
      );
      throw new ForbiddenException('GitHub 설치 정보를 가져올 수 없습니다');
    }

    const hasAccess = installations.some(
      (install) => install.githubInstallationId === installationId,
    );

    if (!hasAccess) {
      throw new ForbiddenException('해당 GitHub 설치에 접근할 권한이 없습니다');
    }

    // UUID로 실제 GitHub Installation ID 찾기
    const installation = installations.find(
      (install) => install.githubInstallationId === installationId,
    );

    if (!installation) {
      throw new ForbiddenException('해당 GitHub 설치를 찾을 수 없습니다');
    }

    // repoFullName을 URL 디코딩 (예: "owner%2Frepo" -> "owner/repo")
    const decodedRepoFullName = decodeURIComponent(repoFullName);

    return this.githubService.getRepositoryBranches(
      String(installation.githubInstallationId),
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

    // DTO 필드들을 타입 안전하게 전달
    const result = await this.projectService.connectRepositoryToProject(
      userId,
      projectId,
      String(connectDto.githubRepoId),
      String(connectDto.githubRepoUrl),
      String(connectDto.githubRepoName),
      String(connectDto.githubOwner),
      connectDto.isPrivate,
      String(connectDto.selectedBranch),
      connectDto.installationId ? String(connectDto.installationId) : undefined,
    );

    // 응답 DTO 형태로 변환
    return {
      ...result,
      user: {
        userId: result.userId,
        username: 'user',
        email: 'user@github.user',
        name: 'User',
      },
    } as ConnectRepositoryResponseDto;
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
    @TypedParam('repositoryId') _repositoryId: string & tags.Format<'uuid'>,
    @Req() req: IRequestType,
  ): Promise<GetBranchesResponseDto> {
    const userId = req.user.user_id;

    // 먼저 이 프로젝트가 사용자 소유인지 확인
    const project = await this.projectService.getProjectDetail(
      userId,
      projectId,
    );

    if (!project) {
      throw new NotFoundException('프로젝트를 찾을 수 없습니다');
    }

    if (!project.installationId) {
      throw new BadRequestException(
        '이 프로젝트에는 GitHub 설치 정보가 없습니다',
      );
    }

    return this.githubService.getRepositoryBranches(
      project.installationId,
      `${project.githubOwner}/${project.githubRepoName}`,
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
    @TypedParam('repositoryId') _repositoryId: string & tags.Format<'uuid'>,
    @TypedBody() updateDto: UpdateBranchRequestDto,
    @Req() req: IRequestType,
  ): Promise<UpdateBranchResponseDto> {
    const userId = req.user.user_id;

    // branchName을 타입 안전하게 전달
    const result = await this.projectService.updateSelectedBranch(
      userId,
      projectId,
      String(updateDto.branchName),
    );

    // 응답 DTO 형태로 변환
    return {
      ...result,
      user: {
        userId: result.userId,
        username: 'user',
        email: 'user@github.user',
        name: 'User',
      },
    } as UpdateBranchResponseDto;
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

    const project = await this.projectService.getProjectDetail(
      userId,
      projectId,
    );

    // DTO 필드명 매핑
    return {
      ...project,
      projectId: project.projectId,
      userId: this.hasUserInfo(project) ? project.user.userId : project.userId,
      user: {
        userId: this.hasUserInfo(project)
          ? project.user.userId
          : project.userId, // userID 필드 추가
        email: `${this.hasUserInfo(project) ? project.user.username || 'user' : 'user'}@github.user`, // GitHub 사용자는 가상 이메일 사용
        name: this.hasUserInfo(project)
          ? project.user.username || 'User'
          : 'User',
      },
      installation: null, // installation 정보
      pipelines: [], // pipelines 정보
    };
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
    const appSlug = process.env.OTTO_GITHUB_APP_NAME || 'otto-test-1';
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

    // 타입 가드로 안전하게 처리
    if (
      !status ||
      typeof status !== 'object' ||
      !('hasInstallations' in status) ||
      !('totalInstallations' in status) ||
      !('totalConnectedProjects' in status) ||
      !('installations' in status) ||
      !Array.isArray(status.installations)
    ) {
      console.error('[GitHub Status] Invalid status data:', status);
      return {
        hasInstallation: false,
        totalInstallations: 0,
        totalConnectedProjects: 0,
        installations: [],
      };
    }

    return {
      hasInstallation: status.hasInstallations,
      // status 객체의 필드를 안전하게 변환하여 할당
      totalInstallations: Number(status.totalInstallations),
      totalConnectedProjects: status.totalConnectedProjects,
      // 각 필드를 타입 안전하게 매핑
      installations: status.installations.map((installation) => ({
        installationId: String(installation.installationId),
        githubInstallationId: String(installation.githubInstallationId),
        accountLogin: String(installation.accountLogin),
        accountId: String(installation.accountId),
        accountType: String(installation.accountType),
        connectedProjects: Number(installation.connectedProjects),
        installedAt: installation.installedAt,
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

    const projects = await this.projectService.getUserProjects(userId);

    // 타입 가드로 안전하게 처리
    if (!this.isProjectArray(projects)) {
      console.error('[Project Controller] Invalid projects data:', projects);
      return [];
    }

    // DTO 필드명 매핑
    return projects.map((project) => ({
      ...project,
      projectId: project.projectId,
      userID: project.userId,
      webhookUrl: null,
      installation: null, // installation 정보 추가
    }));
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
  ): Promise<{ url: string; statusCode: number }> {
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

      // 타입 가드로 안전하게 처리
      if (!this.isGithubInstallation(installation)) {
        console.error(
          '[GitHub Callback] Invalid installation data:',
          installation,
        );
        throw new Error('설치 정보를 저장할 수 없습니다');
      }

      // installation 결과를 타입 안전하게 로깅
      console.log('[GitHub Callback] Installation saved successfully:', {
        userId,
        installationId: String(installation.installationId),
        accountLogin: String(installation.accountLogin || ''),
        dbId: String(installation.installationId),
      });

      // URL 파라미터를 타입 안전하게 구성
      const successUrl = `${frontendUrl}${callbackPath}?status=success&installation_id=${encodeURIComponent(
        installationIdStr,
      )}&account_login=${encodeURIComponent(String(installation.accountLogin || ''))}`;

      console.log('[GitHub Callback] Redirecting to:', successUrl);

      return {
        url: successUrl,
        statusCode: 302,
      };
    } catch (error: unknown) {
      // 5) 예외 처리 및 에러 리다이렉트 - error를 타입 안전하게 처리
      const errorInfo = this.getErrorInfo(error);
      console.error('[GitHub Callback] Error occurred:', errorInfo);

      // 에러 타입별 세분화 - Error 타입 체크로 안전하게 처리
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
      repository: `${createDto.githubOwner}/${createDto.githubRepoName}`,
      installationId: createDto.installationId,
      selectedBranch: createDto.selectedBranch,
    });

    // DTO 필드들을 타입 안전하게 매핑하여 전달
    return this.projectService.createProjectWithGithub(userId, {
      name: String(createDto.name),
      description: createDto.description
        ? String(createDto.description)
        : undefined,
      installationId: String(createDto.installationId),
      githubRepoId: String(createDto.githubRepoId),
      githubRepoUrl: String(createDto.githubRepoUrl),
      githubRepoName: String(createDto.githubRepoName),
      githubOwner: String(createDto.githubOwner),
      // isPrivate는 boolean 타입이므로 안전하게 할당
      isPrivate: Boolean(createDto.isPrivate),
      selectedBranch: String(createDto.selectedBranch),
    });
  }
}

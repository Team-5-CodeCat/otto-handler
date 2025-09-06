// controllers/project.controller.ts
import {
  Controller,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Req,
  HttpStatus,
} from '@nestjs/common';
import { ProjectService } from '../services/project.service';
import { GithubService } from '../services/github.service';
import {
  TypedBody,
  TypedException,
  TypedParam,
  TypedRoute,
} from '@nestia/core';
import { AuthGuard } from 'src/common/decorators';
import type { IRequestType } from 'src/common/type';
import { CommonErrorResponseDto } from 'src/common/dto/response/common-error-response.dto';
import type {
  CreateProjectRequestDto,
  RegisterInstallationRequestDto,
  ConnectRepositoryRequestDto,
  UpdateBranchRequestDto,
  CreateProjectResponseDto,
  RegisterInstallationResponseDto,
  GetRepositoriesResponseDto,
  ConnectRepositoryResponseDto,
  GetBranchesResponseDto,
  UpdateBranchResponseDto,
  GetUserGithubInstallationsResponseDto,
  GetProjectDetailResponseDto,
  GetUserProjectsResponseDto,
} from '../dtos';
import { tags } from 'typia';

@Controller('projects')
export class ProjectController {
  constructor(
    private projectService: ProjectService,
    private githubService: GithubService,
  ) {}

  /**
   *
   * @tag project
   * @summary 새 프로젝트 생성
   *
   */
  @AuthGuard()
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
  @TypedRoute.Post('createProject')
  async createProject(
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
   *
   *@tag project
   *@summary GitHub app 설치 등록
   */
  @AuthGuard()
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

  // 2단계: GitHub 설치 등록
  @TypedRoute.Post('github-installations')
  async registerGithubInstallation(
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
   *
   *@tag project
   *@summary GitHub 설치 목록 조회 (사용자가 등록한 모든 GitHub 계정)
   */
  @AuthGuard()
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
  // GitHub 설치 목록 조회 (사용자가 등록한 모든 GitHub 계정)
  @TypedRoute.Get('github-installations')
  async getUserGithubInstallations(
    @Req() req: IRequestType,
  ): Promise<GetUserGithubInstallationsResponseDto> {
    const userId = req.user.user_id;

    return this.projectService.getUserGithubInstallations(userId);
  }

  /**
   *
   *@tag project
   *@summary 특정 설치에서 접근 가능한 레포지토리 목록 조회
   */
  @AuthGuard()
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
  // 3단계: 특정 설치에서 접근 가능한 레포지토리 목록 조회
  @TypedRoute.Get('github-installations/:installationId/repositories')
  async getAvailableRepositories(
    @TypedParam('installationId') installationId: string & tags.Format<'uuid'>,
    @Req() req: IRequestType,
  ): Promise<GetRepositoriesResponseDto> {
    const userId = req.user.user_id;

    // 보안 검증: 이 설치가 현재 사용자 소유인지 확인
    const installations =
      await this.projectService.getUserGithubInstallations(userId);
    const hasAccess = installations.some(
      (install) => install.installationId === installationId,
    );

    if (!hasAccess) {
      throw new ForbiddenException('해당 GitHub 설치에 접근할 권한이 없습니다');
    }

    return this.githubService.getAccessibleRepositories(installationId);
  }

  /**
   *
   *@tag project
   *@summary 프로젝트에 레포지토리 연결
   */
  @AuthGuard()
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
  // 4단계: 프로젝트에 레포지토리 연결
  @TypedRoute.Post(':projectId/repositories')
  async connectRepository(
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
   *
   *@tag project
   *@summary 레포지토리의 브랜치 목록 조회
   */
  @AuthGuard()
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
  // 5단계: 레포지토리의 브랜치 목록 조회
  @TypedRoute.Get(':projectId/repositories/:repositoryId/branches')
  async getRepositoryBranches(
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
   *
   *@tag project
   *@summary 선택된 브랜치 변경
   */
  @AuthGuard()
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.BAD_REQUEST,
    description: '잘못된 요청',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.UNAUTHORIZED,
    description: '로그인 필요',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.FORBIDDEN,
    description: '권한 없음',
  })
  // 6단계: 선택된 브랜치 변경
  @TypedRoute.Patch(':projectId/repositories/:repositoryId/branch')
  async updateSelectedBranch(
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
   *
   *@tag project
   *@summary 프로젝트 상세 정보 조회 (연결된 레포지토리들과 함께)
   */
  @AuthGuard()
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.BAD_REQUEST,
    description: '잘못된 요청',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.UNAUTHORIZED,
    description: '로그인 필요',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.FORBIDDEN,
    description: '권한 없음',
  })
  @TypedRoute.Get(':projectId')
  async getProjectDetail(
    @TypedParam('projectId') projectId: string & tags.Format<'uuid'>,
    @Req() req: IRequestType,
  ): Promise<GetProjectDetailResponseDto> {
    const userId = req.user.user_id;

    return this.projectService.getProjectDetail(userId, projectId);
  }

  /**
   *
   *@tag project
   *@summary 사용자의 모든 프로젝트 목록 조회
   */
  @AuthGuard()
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.BAD_REQUEST,
    description: '잘못된 요청',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.UNAUTHORIZED,
    description: '로그인 필요',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.FORBIDDEN,
    description: '권한 없음',
  })
  @TypedRoute.Get()
  async getUserProjects(
    @Req() req: IRequestType,
  ): Promise<GetUserProjectsResponseDto> {
    const userId = req.user.user_id;

    return this.projectService.getUserProjects(userId);
  }
}

// services/project.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GithubService } from './github.service';
import { JwtService } from '../../auth/services/jwt.service';

@Injectable()
export class ProjectService {
  constructor(
    private prisma: PrismaService,
    private githubService: GithubService,
    private jwtService: JwtService,
  ) {}

  /**
   * 새 프로젝트를 생성합니다
   * 동일한 사용자가 같은 이름의 프로젝트를 만들 수 없도록 유니크 제약조건이 있습니다
   */
  async createProject(userId: string, name: string, webhookUrl?: string) {
    try {
      const project = await this.prisma.project.create({
        data: {
          userID: userId,
          name: name.trim(),
          webhookUrl,
        },
        // 생성된 프로젝트와 함께 사용자 정보도 포함해서 반환
        include: {
          user: {
            select: {
              userID: true,
              email: true,
              name: true,
            },
          },
        },
      });

      return project;
    } catch (error) {
      // Prisma의 유니크 제약조건 위반 에러 처리
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException('같은 이름의 프로젝트가 이미 존재합니다');
      }
      throw error;
    }
  }

  /**
   * GitHub 설치 정보를 등록하거나 업데이트합니다 (upsert)
   * 같은 설치 ID가 이미 있으면 업데이트하고, 없으면 새로 생성합니다
   */
  async registerGithubInstallation(userId: string, installationId: string) {
    // 1. 먼저 GitHub에서 이 설치가 유효한지 검증
    const installationInfo =
      await this.githubService.validateInstallation(installationId);

    // 2. 데이터베이스에 upsert (있으면 업데이트, 없으면 생성)
    const installation = await this.prisma.githubInstallation.upsert({
      where: {
        installationId: installationId,
      },
      update: {
        // 기존 설치 정보 업데이트 - 소유자가 바뀔 수 있으니 최신 정보로 갱신
        userID: userId,
        accountLogin: installationInfo.account.login,
        accountId: installationInfo.account.id.toString(),
        lastUsedAt: new Date(),
      },
      create: {
        // 새 설치 정보 생성
        userID: userId,
        installationId: installationId,
        accountLogin: installationInfo.account.login,
        accountId: installationInfo.account.id.toString(),
      },
      include: {
        user: {
          select: {
            userID: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return installation;
  }

  /**
   * 사용자의 GitHub 설치 목록을 조회합니다
   * 한 사용자가 여러 계정에 앱을 설치했을 경우를 고려
   */
  async getUserGithubInstallations(userId: string) {
    return this.prisma.githubInstallation.findMany({
      where: {
        userID: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * 사용자의 모든 프로젝트 목록을 조회합니다
   */
  async getUserProjects(userId: string) {
    return this.prisma.project.findMany({
      where: {
        userID: userId,
      },
      include: {
        repositories: {
          select: {
            id: true,
            repoFullName: true,
            selectedBranch: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * 프로젝트에 레포지토리를 연결합니다
   * 트랜잭션을 사용하여 데이터 일관성을 보장
   */
  async connectRepositoryToProject(
    userId: string,
    projectId: string,
    repoFullName: string,
    selectedBranch: string,
    installationId?: string,
  ) {
    // 1. 프로젝트 소유권 확인
    const project = await this.prisma.project.findFirst({
      where: {
        projectID: projectId,
        userID: userId,
      },
    });

    if (!project) {
      throw new NotFoundException(
        '프로젝트를 찾을 수 없거나 접근 권한이 없습니다',
      );
    }

    // 2. 설치 ID가 제공된 경우 해당 설치가 사용자 소유인지 확인
    if (installationId) {
      const installation = await this.prisma.githubInstallation.findFirst({
        where: {
          installationId: installationId,
          userID: userId,
        },
      });

      if (!installation) {
        throw new ForbiddenException('해당 GitHub 설치에 대한 권한이 없습니다');
      }
    }

    // 3. 트랜잭션으로 레포지토리 연결 처리
    try {
      const projectRepository = await this.prisma.projectRepository.create({
        data: {
          projectID: projectId,
          repoFullName: repoFullName,
          selectedBranch: selectedBranch,
          installationId: installationId,
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

      return projectRepository;
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException(
          '이 레포지토리는 이미 프로젝트에 연결되어 있습니다',
        );
      }
      throw error;
    }
  }

  /**
   * 프로젝트의 레포지토리 브랜치를 변경합니다
   */
  async updateSelectedBranch(
    userId: string,
    projectId: string,
    repositoryId: string,
    newBranch: string,
  ) {
    // 1. 해당 레포지토리가 사용자의 프로젝트에 속하는지 확인
    const projectRepository = await this.prisma.projectRepository.findFirst({
      where: {
        id: repositoryId,
        project: {
          projectID: projectId,
          userID: userId,
        },
      },
      include: {
        project: true,
      },
    });

    if (!projectRepository) {
      throw new NotFoundException(
        '레포지토리를 찾을 수 없거나 접근 권한이 없습니다',
      );
    }

    // 2. 새 브랜치가 실제로 존재하는지 GitHub에서 확인 (선택사항이지만 권장)
    if (projectRepository.installationId) {
      try {
        const branches = await this.githubService.getRepositoryBranches(
          projectRepository.installationId,
          projectRepository.repoFullName,
        );

        const branchExists = branches.some(
          (branch) => branch.name === newBranch,
        );
        if (!branchExists) {
          throw new BadRequestException(
            `브랜치 '${newBranch}'가 존재하지 않습니다`,
          );
        }
      } catch (error) {
        // GitHub API 호출 실패 시에도 브랜치 업데이트는 허용 (네트워크 문제 등 고려)
        console.warn(
          '브랜치 존재 확인 실패:',
          (error as { message: string }).message,
        );
      }
    }

    // 3. 브랜치 업데이트
    const updated = await this.prisma.projectRepository.update({
      where: {
        id: repositoryId,
      },
      data: {
        selectedBranch: newBranch,
        updatedAt: new Date(),
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

    return updated;
  }

  /**
   * 프로젝트의 상세 정보를 조회합니다 (연결된 레포지토리 포함)
   */
  async getProjectDetail(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        projectID: projectId,
        userID: userId,
      },
      include: {
        repositories: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        user: {
          select: {
            userID: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('프로젝트를 찾을 수 없습니다');
    }

    return project;
  }

  /**
   * GitHub 설치 URL state 생성 (JWT 서명)
   */
  generateGithubInstallState(userId: string): string {
    const payload = {
      userId,
      type: 'github_install_state',
      iat: Math.floor(Date.now() / 1000),
    };

    // 10분 유효기간으로 JWT 서명 생성
    return this.jwtService.encode(payload, { expiresIn: '10m' });
  }

  /**
   * state 토큰에서 userId 복구 (JWT 검증)
   */
  parseGithubInstallState(state: string): string | null {
    try {
      const decoded = this.jwtService.decode<{
        userId: string;
        type: string;
        iat: number;
      }>(state);

      if (!decoded || decoded.type !== 'github_install_state') {
        return null;
      }

      return decoded.userId;
    } catch {
      return null;
    }
  }

  /**
   * installationId를 사용자와 연결
   */
  async linkInstallationToUser(userId: string, installationId: string) {
    return this.registerGithubInstallation(userId, installationId);
  }

  /**
   * 레포지토리로 연결된 프로젝트들 조회
   */
  async findProjectsByRepository(repoFullName: string, installationId: string) {
    return this.prisma.projectRepository.findMany({
      where: {
        repoFullName,
        installationId,
      },
      include: { project: true },
    });
  }

  /**
   * 빌드 레코드 생성 (기본 파이프라인 런 기록)
   */
  async createBuildRecord(
    projectId: string,
    buildInfo: { trigger: string; metadata?: Record<string, unknown> },
  ) {
    // 간단한 placeholder: 프로젝트에 활성 파이프라인 1개 선택 후 실행 레코드 생성
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { projectID: projectId, active: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!pipeline) {
      throw new BadRequestException('활성 파이프라인이 없습니다');
    }
    const run = await this.prisma.pipelineRun.create({
      data: {
        pipelineID: pipeline.pipelineID,
        pipelineVersion: pipeline.version,
        status: 'pending' as never,
        trigger: buildInfo.trigger,
        metadata: (buildInfo.metadata ?? {}) as never,
      },
    });
    return run;
  }

  /**
   * GitHub 연동 프로젝트 생성 (프로젝트 + 레포지토리 연결만)
   */
  async createProjectWithGithub(
    userId: string,
    data: {
      name: string;
      installationId: string;
      repositoryFullName: string;
      selectedBranch: string;
    },
  ) {
    console.log('[Project Service] Creating project with GitHub integration:', {
      userId,
      name: data.name,
      repository: data.repositoryFullName,
      branch: data.selectedBranch,
    });

    return await this.prisma.$transaction(async (tx) => {
      // 1. 프로젝트 생성
      const project = await tx.project.create({
        data: {
          userID: userId,
          name: data.name,
          webhookUrl: null, // 나중에 설정 가능
        },
      });

      console.log('[Project Service] Project created:', project.projectID);

      // 2. Installation UUID로 실제 GitHub Installation ID 조회
      const installation = await tx.githubInstallation.findUnique({
        where: { id: data.installationId },
      });

      if (!installation) {
        throw new BadRequestException('유효하지 않은 GitHub 설치 ID입니다');
      }

      if (installation.userID !== userId) {
        throw new ForbiddenException(
          '해당 GitHub 설치에 접근할 권한이 없습니다',
        );
      }

      // 3. 프로젝트-레포지토리 연결
      const projectRepository = await tx.projectRepository.create({
        data: {
          projectID: project.projectID,
          repoFullName: data.repositoryFullName,
          selectedBranch: data.selectedBranch,
          installationId: installation.installationId, // 실제 GitHub Installation ID
          isActive: true,
        },
      });

      console.log(
        '[Project Service] Repository connected:',
        projectRepository.id,
      );

      // 4. 생성된 데이터 반환 (Environment는 별도 관리)
      return {
        project: {
          projectID: project.projectID,
          name: project.name,
          webhookUrl: project.webhookUrl,
          createdAt: project.createdAt.toISOString(),
        },
        repository: {
          id: projectRepository.id,
          repoFullName: projectRepository.repoFullName,
          selectedBranch: projectRepository.selectedBranch,
          installationId: projectRepository.installationId,
          isActive: projectRepository.isActive,
        },
      };
    });
  }
}

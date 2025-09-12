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
import * as crypto from 'crypto';

@Injectable()
export class ProjectService {
  constructor(
    private prisma: PrismaService,
    private githubService: GithubService,
    private jwtService: JwtService,
  ) {}

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
   * 문자열 타입 가드
   */
  private isString(value: unknown): value is string {
    return typeof value === 'string';
  }

  /**
   * 숫자 타입 가드
   */
  private isNumber(value: unknown): value is number {
    return typeof value === 'number';
  }

  /**
   * 안전하게 문자열 값을 추출하는 헬퍼
   */
  private getStringValue(obj: unknown, key: string): string | undefined {
    if (
      typeof obj === 'object' &&
      obj !== null &&
      key in obj &&
      typeof (obj as Record<string, unknown>)[key] === 'string'
    ) {
      return (obj as Record<string, unknown>)[key] as string;
    }
    return undefined;
  }

  /**
   * 안전하게 숫자 값을 추출하는 헬퍼
   */
  private getNumberValue(obj: unknown, key: string): number | undefined {
    if (
      typeof obj === 'object' &&
      obj !== null &&
      key in obj &&
      typeof (obj as Record<string, unknown>)[key] === 'number'
    ) {
      return (obj as Record<string, unknown>)[key] as number;
    }
    return undefined;
  }

  /**
   * 안전하게 객체 값을 추출하는 헬퍼
   */
  private getObjectValue(
    obj: unknown,
    key: string,
  ): Record<string, unknown> | undefined {
    if (
      this.hasProperty(obj, key) &&
      typeof obj[key] === 'object' &&
      obj[key] !== null
    ) {
      return obj[key] as Record<string, unknown>;
    }
    return undefined;
  }

  /**
   * 안전하게 배열 값을 추출하는 헬퍼
   */
  private getArrayValue(obj: unknown, key: string): unknown[] | undefined {
    if (this.hasProperty(obj, key) && Array.isArray(obj[key])) {
      return obj[key] as unknown[];
    }
    return undefined;
  }

  /**
   * Date 객체를 안전하게 생성하는 헬퍼
   */
  private safeCreateDate(value: unknown): Date | undefined {
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? undefined : date;
    }
    return undefined;
  }

  /**
   * 새 프로젝트를 생성합니다
   * 동일한 사용자가 같은 이름의 프로젝트를 만들 수 없도록 유니크 제약조건이 있습니다
   */
  async createProject(userId: string, name: string, description?: string) {
    try {
      const project = await this.prisma.project.create({
        data: {
          projectId: crypto.randomUUID(),
          userId: userId,
          name: name.trim(),
          description,
          githubRepoId: '',
          githubRepoUrl: '',
          githubRepoName: '',
          githubOwner: '',
        },
        // 생성된 프로젝트와 함께 사용자 정보도 포함해서 반환
        include: {
          user: {
            select: {
              userId: true,
              username: true,
              githubId: true,
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
  async registerGithubInstallation(
    userId: string,
    githubInstallationId: string,
  ) {
    // 1. 먼저 GitHub에서 이 설치가 유효한지 검증
    const installationInfo =
      await this.githubService.validateInstallation(githubInstallationId);

    // 2. 데이터베이스에 upsert (있으면 업데이트, 없으면 생성)
    const installation = await this.prisma.githubInstallation.upsert({
      where: {
        githubInstallationId: githubInstallationId,
      },
      update: {
        // 기존 설치 정보 업데이트 - 소유자가 바뀔 수 있으니 최신 정보로 갱신
        userId: userId,
        accountLogin: installationInfo.account.login,
        accountId: installationInfo.account.id.toString(),
        accountType: installationInfo.account.type,
      },
      create: {
        // 새 설치 정보 생성
        installationId: crypto.randomUUID(),
        userId: userId,
        githubInstallationId: githubInstallationId,
        accountLogin: installationInfo.account.login,
        accountId: installationInfo.account.id.toString(),
        accountType: installationInfo.account.type,
      },
      include: {
        user: {
          select: {
            userId: true,
            username: true,
            githubId: true,
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
        userId: userId,
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
    const projects = await this.prisma.project.findMany({
      where: {
        userId: userId,
      },
      include: {
        installation: {
          select: {
            installationId: true,
            githubInstallationId: true,
            accountLogin: true,
            accountType: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Project 모델에 GitHub 정보가 직접 포함되어 있으므로
    // repositories 형태로 변환
    return projects.map((project) => ({
      ...project,
      repositories: project.githubRepoUrl
        ? [
            {
              id: project.projectId,
              repoFullName: `${project.githubOwner}/${project.githubRepoName}`,
              selectedBranch: project.selectedBranch,
              isActive: project.isActive,
            },
          ]
        : [],
    }));
  }

  /**
   * 프로젝트에 레포지토리를 연결합니다
   * 트랜잭션을 사용하여 데이터 일관성을 보장
   */
  async connectRepositoryToProject(
    userId: string,
    projectId: string,
    githubRepoId: string,
    githubRepoUrl: string,
    githubRepoName: string,
    githubOwner: string,
    isPrivate: boolean,
    selectedBranch: string,
    installationId?: string,
  ) {
    // 1. 프로젝트 소유권 확인
    const project = await this.prisma.project.findFirst({
      where: {
        projectId: projectId,
        userId: userId,
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
          userId: userId,
        },
      });

      if (!installation) {
        throw new ForbiddenException('해당 GitHub 설치에 대한 권한이 없습니다');
      }
    }

    // 3. 프로젝트에 GitHub 정보 업데이트
    try {
      const updatedProject = await this.prisma.project.update({
        where: {
          projectId: projectId,
        },
        data: {
          githubRepoId: githubRepoId,
          githubRepoUrl: githubRepoUrl,
          githubRepoName: githubRepoName,
          githubOwner: githubOwner,
          isPrivate: isPrivate,
          selectedBranch: selectedBranch,
          installationId: installationId,
        },
        include: {
          user: {
            select: {
              userId: true,
              username: true,
            },
          },
        },
      });

      return updatedProject;
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException(
          '이 레포지토리는 이미 다른 프로젝트에 연결되어 있습니다',
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
    newBranch: string,
  ) {
    // 1. 해당 프로젝트가 사용자 소유인지 확인
    const project = await this.prisma.project.findFirst({
      where: {
        projectId: projectId,
        userId: userId,
      },
      include: {
        installation: true,
      },
    });

    if (!project) {
      throw new NotFoundException(
        '프로젝트를 찾을 수 없거나 접근 권한이 없습니다',
      );
    }

    // 2. 새 브랜치가 실제로 존재하는지 GitHub에서 확인 (선택사항이지만 권장)
    if (project.installation) {
      try {
        const repoFullName = `${project.githubOwner}/${project.githubRepoName}`;
        const branches = await this.githubService.getRepositoryBranches(
          project.installation.githubInstallationId,
          repoFullName,
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
    const updated = await this.prisma.project.update({
      where: {
        projectId: projectId,
      },
      data: {
        selectedBranch: newBranch,
      },
      include: {
        user: {
          select: {
            userId: true,
            username: true,
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
        projectId: projectId,
        userId: userId,
      },
      include: {
        installation: {
          select: {
            installationId: true,
            githubInstallationId: true,
            accountLogin: true,
            accountType: true,
          },
        },
        pipelines: {
          select: {
            pipelineId: true,
            name: true,
            description: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        user: {
          select: {
            userId: true,
            username: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('프로젝트를 찾을 수 없습니다');
    }

    // Project 모델에서 repositories 형태로 변환
    return {
      ...project,
      repositories: project.githubRepoUrl
        ? [
            {
              id: project.projectId,
              repoFullName: `${project.githubOwner}/${project.githubRepoName}`,
              selectedBranch: project.selectedBranch,
              isActive: project.isActive,
              installationId: project.installationId,
              createdAt: project.createdAt,
              updatedAt: project.updatedAt,
            },
          ]
        : [],
    };
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
  async linkInstallationToUser(userId: string, githubInstallationId: string) {
    return this.registerGithubInstallation(userId, githubInstallationId);
  }

  /**
   * 레포지토리로 연결된 프로젝트들 조회
   */
  async findProjectsByRepository(
    githubOwner: string,
    githubRepoName: string,
    githubInstallationId: string,
  ) {
    return this.prisma.project.findMany({
      where: {
        githubOwner,
        githubRepoName,
        installation: {
          githubInstallationId,
        },
      },
      include: {
        user: {
          select: {
            userId: true,
            username: true,
          },
        },
      },
    });
  }

  /**
   * GitHub 연동 프로젝트 생성 (프로젝트 + 레포지토리 연결만)
   */
  async createProjectWithGithub(
    userId: string,
    data: {
      name: string;
      description?: string;
      installationId: string;
      githubRepoId: string;
      githubRepoUrl: string;
      githubRepoName: string;
      githubOwner: string;
      isPrivate: boolean;
      selectedBranch: string;
    },
  ) {
    console.log('[Project Service] Creating project with GitHub integration:', {
      userId,
      name: data.name,
      repository: `${data.githubOwner}/${data.githubRepoName}`,
      branch: data.selectedBranch,
    });

    return await this.prisma.$transaction(async (tx) => {
      // 1. GitHub Installation ID로 직접 조회
      const installation = await tx.githubInstallation.findUnique({
        where: { installationId: data.installationId },
      });

      if (!installation) {
        throw new BadRequestException('유효하지 않은 GitHub 설치 ID입니다');
      }

      if (installation.userId !== userId) {
        throw new ForbiddenException(
          '해당 GitHub 설치에 접근할 권한이 없습니다',
        );
      }

      // 2. 프로젝트 생성 (GitHub 정보 포함)
      const project = await tx.project.create({
        data: {
          projectId: crypto.randomUUID(),
          userId: userId,
          name: data.name,
          description: data.description,
          githubRepoId: data.githubRepoId,
          githubRepoUrl: data.githubRepoUrl,
          githubRepoName: data.githubRepoName,
          githubOwner: data.githubOwner,
          isPrivate: data.isPrivate,
          selectedBranch: data.selectedBranch,
          installationId: installation.installationId,
        },
      });

      console.log('[Project Service] Project created:', project.projectId);

      // 3. 생성된 데이터 반환
      return {
        project: {
          projectId: project.projectId,
          name: project.name,
          description: project.description,
          isActive: project.isActive,
          githubRepoId: project.githubRepoId,
          selectedBranch: project.selectedBranch,
          githubRepoUrl: project.githubRepoUrl,
          githubRepoName: project.githubRepoName,
          githubOwner: project.githubOwner,
          isPrivate: project.isPrivate,
          createdAt: project.createdAt.toISOString(),
        },
      };
    });
  }

  /**
   * GitHub App 설치 이벤트 처리 (웹훅에서 호출)
   * 새로 설치된 앱의 정보를 데이터베이스에 저장하거나 업데이트합니다
   */
  async handleGitHubAppInstalled(
    githubInstallationId: number,
    installationInfo?: {
      account: string;
      targetId: number;
      accountType: 'User' | 'Organization';
      repositorySelection?: 'selected' | 'all';
    },
  ) {
    const githubInstallationIdStr = githubInstallationId.toString();

    console.log(
      `[ProjectService] Handling GitHub app installation: ${githubInstallationIdStr} (${installationInfo?.account || 'unknown'})`,
    );

    try {
      let accountInfo: {
        login: string;
        id: number;
        type: 'User' | 'Organization';
      };

      if (installationInfo) {
        // 웹훅에서 제공된 정보 사용
        accountInfo = {
          login: installationInfo.account,
          id: installationInfo.targetId,
          type: installationInfo.accountType,
        };
      } else {
        // 기존 방식: GitHub API에서 설치 정보 조회 (fallback)
        const apiInfo = await this.githubService.validateInstallation(
          githubInstallationIdStr,
        );
        accountInfo = apiInfo.account;
      }

      // 기존 설치 정보가 있는지 확인
      const existingInstallation =
        await this.prisma.githubInstallation.findUnique({
          where: { githubInstallationId: githubInstallationIdStr },
        });

      if (existingInstallation) {
        // 기존 설치 정보 업데이트
        const updated = await this.prisma.githubInstallation.update({
          where: { githubInstallationId: githubInstallationIdStr },
          data: {
            accountLogin: accountInfo.login,
            accountId: accountInfo.id.toString(),
            accountType: accountInfo.type,
          },
        });

        console.log(
          `[ProjectService] Updated existing installation: ${updated.installationId}`,
        );
        return updated;
      } else {
        // 새 설치 정보는 사용자가 직접 연결할 때까지 대기
        // 웹훅만으로는 어느 사용자가 설치했는지 알 수 없으므로
        // 하지만 기본 정보는 로그로 기록
        console.log(
          `[ProjectService] New installation detected: ${githubInstallationIdStr} for ${accountInfo.login} (ID: ${accountInfo.id})`,
        );
        console.log(
          `[ProjectService] Installation will be linked when user connects it manually`,
        );
        return null;
      }
    } catch (error) {
      console.error(
        '[ProjectService] Error handling GitHub app installation:',
        error,
      );
      // GitHub API 호출 실패 시에도 로그는 남겨둠
      if (installationInfo) {
        console.log(
          `[ProjectService] Installation info from webhook: ${installationInfo.account} (${installationInfo.accountType})`,
        );
      }
      throw error;
    }
  }

  /**
   * GitHub App 제거 이벤트 처리 (웹훅에서 호출)
   * 제거된 앱의 설치 정보를 비활성화하거나 삭제합니다
   */
  async handleGitHubAppUninstalled(githubInstallationId: number) {
    const githubInstallationIdStr = githubInstallationId.toString();

    console.log(
      `[ProjectService] Handling GitHub app uninstallation: ${githubInstallationIdStr}`,
    );

    try {
      // 관련된 설치 정보 조회
      const installation = await this.prisma.githubInstallation.findUnique({
        where: { githubInstallationId: githubInstallationIdStr },
      });

      if (!installation) {
        console.log(
          `[ProjectService] Installation not found: ${githubInstallationIdStr}`,
        );
        return null;
      }

      // 트랜잭션으로 관련 데이터 정리
      return await this.prisma.$transaction(async (tx) => {
        // 1. 해당 설치와 연결된 모든 프로젝트를 비활성화
        const updatedProjects = await tx.project.updateMany({
          where: { installationId: installation.installationId },
          data: {
            isActive: false,
          },
        });

        console.log(
          `[ProjectService] Deactivated ${updatedProjects.count} projects`,
        );

        // 2. 설치 정보 삭제
        const deletedInstallation = await tx.githubInstallation.delete({
          where: { githubInstallationId: githubInstallationIdStr },
        });

        console.log(
          `[ProjectService] Deleted installation: ${deletedInstallation.installationId}`,
        );

        return {
          deletedInstallation,
          deactivatedProjects: updatedProjects.count,
        };
      });
    } catch (error) {
      console.error(
        '[ProjectService] Error handling GitHub app uninstallation:',
        error,
      );
      throw error;
    }
  }

  /**
   * 사용자의 GitHub 설치 상태 조회
   * GET /api/v1/projects/github/status에서 사용
   */
  async getGitHubInstallationStatus(userId: string) {
    const installations = await this.prisma.githubInstallation.findMany({
      where: { userId: userId },
      select: {
        installationId: true,
        githubInstallationId: true,
        accountLogin: true,
        accountId: true,
        accountType: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // 각 설치에 연결된 프로젝트 개수 조회
    const installationsWithCount = await Promise.all(
      installations.map(async (installation) => {
        const projectCount = await this.prisma.project.count({
          where: { installationId: installation.installationId },
        });

        return {
          installationId: installation.installationId,
          githubInstallationId: installation.githubInstallationId,
          accountLogin: installation.accountLogin,
          accountId: String(installation.accountId),
          accountType: installation.accountType,
          connectedProjects: projectCount,
          installedAt: installation.createdAt.toISOString(),
        };
      }),
    );

    const totalProjects = installationsWithCount.reduce(
      (sum, installation) => sum + installation.connectedProjects,
      0,
    );

    return {
      hasInstallations: installations.length > 0,
      totalInstallations: installations.length,
      totalConnectedProjects: totalProjects,
      installations: installationsWithCount,
    };
  }

  /**
   * Push 이벤트 기록 (사용자 히스토리용)
   */
  async recordPushEvent(
    projectId: string,
    pushData: {
      branch: string;
      commitSha: string;
      commitMessage?: string;
      pusherName?: string;
      pushedAt: Date;
    },
  ) {
    return this.prisma.pushEvent.create({
      data: {
        pushEventId: crypto.randomUUID(),
        projectId: projectId,
        branch: pushData.branch,
        commitSha: pushData.commitSha,
        commitMessage: pushData.commitMessage,
        pusherName: pushData.pusherName,
        pushedAt: pushData.pushedAt,
      },
    });
  }

  /**
   * 프로젝트의 Push 히스토리 조회
   */
  async getProjectPushHistory(
    userId: string,
    projectId: string,
    limit: number = 50,
  ) {
    // 프로젝트 소유권 확인
    const project = await this.prisma.project.findFirst({
      where: {
        projectId: projectId,
        userId: userId,
      },
    });

    if (!project) {
      throw new NotFoundException(
        '프로젝트를 찾을 수 없거나 접근 권한이 없습니다',
      );
    }

    return this.prisma.pushEvent.findMany({
      where: {
        projectId: projectId,
      },
      orderBy: {
        pushedAt: 'desc',
      },
      take: limit,
    });
  }
}

// services/github.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';

// GitHub API 응답 타입 정의
interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  default_branch: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
}

interface GitHubBranch {
  name: string;
  protected: boolean;
  commit: {
    sha: string;
    url: string;
  };
}

interface GitHubAccount {
  login: string;
  id: number;
  type: 'User' | 'Organization';
}

interface GitHubInstallation {
  id: number;
  account: GitHubAccount;
  permissions: Record<string, string>;
  created_at: string;
}

@Injectable()
export class GithubService {
  private appId: string;
  private privateKey: string;

  constructor(private prisma: PrismaService) {
    // GitHub App 설정값 저장
    this.appId = process.env.GITHUB_APP_ID || '';
    this.privateKey = process.env.GITHUB_APP_PRIVATE_KEY || '';

    if (!this.appId || !this.privateKey) {
      throw new Error('GitHub App ID와 Private Key가 설정되지 않았습니다');
    }
  }

  /**
   * 설치 ID로 Octokit 인스턴스를 가져옵니다
   * 이 메서드가 호출될 때마다 Octokit은 자동으로:
   * 1. JWT 토큰을 생성하여 GitHub App으로 인증
   * 2. 설치 토큰을 발급받아 해당 설치에 대한 권한 획득
   * 3. 토큰이 만료되면 자동으로 갱신
   */
  private getInstallationOctokit(installationId: string) {
    try {
      const auth = createAppAuth({
        appId: this.appId,
        privateKey: this.privateKey,
        installationId: parseInt(installationId),
      });

      return new Octokit({
        auth,
      });
    } catch {
      throw new BadRequestException(
        `GitHub 설치 ${installationId}에 접근할 수 없습니다. 설치가 유효한지 확인해주세요.`,
      );
    }
  }

  /**
   * 특정 설치에서 접근 가능한 모든 레포지토리를 조회합니다
   * GitHub App이 설치된 계정의 레포지토리 중에서
   * 앱에게 권한이 부여된 레포지토리만 반환됩니다
   */
  async getAccessibleRepositories(installationId: string) {
    const octokit = this.getInstallationOctokit(installationId);

    try {
      const { data } =
        await octokit.rest.apps.listReposAccessibleToInstallation();

      // 레포지토리 정보를 우리 애플리케이션에서 사용하기 편한 형태로 변환
      return (data as { repositories: GitHubRepository[] }).repositories.map(
        (repo) => ({
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name, // "owner/repo" 형태
          description: repo.description,
          private: repo.private,
          defaultBranch: repo.default_branch,
          language: repo.language,
          stargazersCount: repo.stargazers_count,
          forksCount: repo.forks_count,
          updatedAt: repo.updated_at,
        }),
      );
    } catch (error) {
      console.error('레포지토리 목록 조회 실패:', error);
      throw new BadRequestException(
        '레포지토리 목록을 가져오는데 실패했습니다',
      );
    }
  }

  /**
   * 특정 레포지토리의 모든 브랜치를 조회합니다
   * owner/repo 형태의 전체 이름을 받아서 분해한 후 API 호출
   */
  async getRepositoryBranches(installationId: string, repoFullName: string) {
    const [owner, repo] = repoFullName.split('/');

    if (!owner || !repo) {
      throw new BadRequestException('올바르지 않은 레포지토리 이름 형식입니다');
    }

    const octokit = this.getInstallationOctokit(installationId);

    try {
      const { data } = await octokit.rest.repos.listBranches({
        owner,
        repo,
        per_page: 100, // 최대 100개까지 조회
      });

      return (data as GitHubBranch[]).map((branch) => ({
        name: branch.name,
        protected: branch.protected,
        commit: {
          sha: branch.commit.sha,
          url: branch.commit.url,
        },
      }));
    } catch (error) {
      console.error('브랜치 목록 조회 실패:', error);
      throw new BadRequestException(
        `${repoFullName}의 브랜치 목록을 가져오는데 실패했습니다`,
      );
    }
  }

  /**
   * GitHub 설치 정보를 검증하고 기본 정보를 반환합니다
   * 새로운 설치를 등록하기 전에 해당 설치가 유효한지 확인하는 용도
   */
  async validateInstallation(installationId: string) {
    try {
      // JWT 토큰으로 앱 인증
      const auth = createAppAuth({
        appId: this.appId,
        privateKey: this.privateKey,
      });

      const octokit = new Octokit({
        auth,
      });

      const { data } = await octokit.rest.apps.getInstallation({
        installation_id: parseInt(installationId),
      });

      const installation = data as GitHubInstallation;

      return {
        id: installation.id,
        account: {
          login: installation.account.login,
          id: installation.account.id,
          type: installation.account.type, // 'User' 또는 'Organization'
        },
        permissions: installation.permissions,
        createdAt: installation.created_at,
      };
    } catch {
      throw new BadRequestException('유효하지 않은 GitHub 설치 ID입니다');
    }
  }
}

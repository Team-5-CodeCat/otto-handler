import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';
import type {
  GetRepositoriesResponseDto,
  GetBranchesResponseDto,
} from '../dtos';

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
    this.appId = process.env.OTTO_GITHUB_APP_ID || '';
    this.privateKey = process.env.OTTO_GITHUB_APP_PRIVATE_KEY || '';

    if (!this.appId || !this.privateKey) {
      throw new Error('GitHub App ID와 Private Key가 설정되지 않았습니다');
    }
  }

  private getInstallationOctokit(installationId: string): Octokit {
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

  async getAccessibleRepositories(
    installationId: string,
  ): Promise<GetRepositoriesResponseDto> {
    const octokit = this.getInstallationOctokit(installationId);

    try {
      const { data } =
        await octokit.rest.apps.listReposAccessibleToInstallation();

      const repos = (data as unknown as { repositories: GitHubRepository[] })
        .repositories;
      return repos.map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.private,
        defaultBranch: repo.default_branch,
        language: repo.language,
        stargazersCount: repo.stargazers_count,
        forksCount: repo.forks_count,
        updatedAt: repo.updated_at,
      }));
    } catch {
      throw new BadRequestException(
        '레포지토리 목록을 가져오는데 실패했습니다',
      );
    }
  }

  async getRepositoryBranches(
    installationId: string,
    repoFullName: string,
  ): Promise<GetBranchesResponseDto> {
    const [owner, repo] = repoFullName.split('/');

    if (!owner || !repo) {
      throw new BadRequestException('올바르지 않은 레포지토리 이름 형식입니다');
    }

    const octokit = this.getInstallationOctokit(installationId);

    try {
      const { data } = await octokit.rest.repos.listBranches({
        owner,
        repo,
        per_page: 100,
      });

      const branches = data as unknown as GitHubBranch[];
      return branches.map((branch) => ({
        name: branch.name,
        protected: branch.protected,
        commit: {
          sha: branch.commit.sha,
          url: branch.commit.url,
        },
      }));
    } catch {
      throw new BadRequestException(
        `${repoFullName}의 브랜치 목록을 가져오는데 실패했습니다`,
      );
    }
  }

  async validateInstallation(installationId: string): Promise<{
    id: number;
    account: { login: string; id: number; type: 'User' | 'Organization' };
    permissions: Record<string, string>;
    createdAt: string;
  }> {
    try {
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

      const installation = data as unknown as GitHubInstallation;

      return {
        id: installation.id,
        account: {
          login: installation.account.login,
          id: installation.account.id,
          type: installation.account.type,
        },
        permissions: installation.permissions,
        createdAt: installation.created_at,
      };
    } catch {
      throw new BadRequestException('유효하지 않은 GitHub 설치 ID입니다');
    }
  }
}

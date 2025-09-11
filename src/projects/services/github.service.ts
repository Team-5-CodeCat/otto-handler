import { Injectable, BadRequestException } from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import * as jwt from 'jsonwebtoken';
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
@Injectable()
export class GithubService {
  private appId: string;
  private privateKey: string;

  constructor() {
    this.appId = String(process.env.OTTO_GITHUB_APP_ID || '');

    // Private Key를 string으로 변환하고 \n을 실제 줄바꿈으로 변환
    const rawPrivateKey = String(process.env.OTTO_GITHUB_APP_PRIVATE_KEY || '');
    this.privateKey = rawPrivateKey.replace(/\\n/g, '\n');

    // PEM 형식 확인 및 추가 정규화
    if (
      !this.privateKey.includes('-----BEGIN RSA PRIVATE KEY-----') &&
      !this.privateKey.includes('-----BEGIN PRIVATE KEY-----')
    ) {
      throw new Error('GitHub App Private Key가 올바른 PEM 형식이 아닙니다');
    }

    if (!this.appId || !this.privateKey) {
      throw new Error('GitHub App ID와 Private Key가 설정되지 않았습니다');
    }

    console.log('[GitHub Service] 인증 정보 로드:', {
      appId: this.appId,
      privateKeyLength: this.privateKey.length,
      privateKeyStart: this.privateKey.substring(0, 50),
      hasBeginMarker: this.privateKey.includes('-----BEGIN'),
      hasEndMarker: this.privateKey.includes('-----END'),
    });
  }

  private generateJWT(): string {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now,
      exp: now + 600, // 10 minutes
      iss: parseInt(this.appId),
    };

    try {
      console.log('[GitHub Service] JWT 생성 시작:', {
        appId: payload.iss,
        iat: payload.iat,
        exp: payload.exp,
        privateKeyLength: this.privateKey.length,
      });

      const token = jwt.sign(payload, this.privateKey, {
        algorithm: 'RS256',
      });

      console.log('[GitHub Service] JWT 생성 성공:', {
        tokenLength: token.length,
        tokenStart: token.substring(0, 30),
      });

      return token;
    } catch (error) {
      console.error('[GitHub Service] JWT 생성 실패:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        privateKeyStart: this.privateKey.substring(0, 50),
      });
      throw new BadRequestException('GitHub App JWT 생성에 실패했습니다');
    }
  }

  private async getInstallationToken(installationId: string): Promise<string> {
    try {
      const jwtToken = this.generateJWT();

      console.log('[GitHub Service] Installation 토큰 요청 시작:', {
        installationId,
        jwtTokenLength: jwtToken.length,
      });

      // JWT로 Installation Access Token 요청
      const octokit = new Octokit({
        auth: jwtToken,
      });

      const { data } = await octokit.rest.apps.createInstallationAccessToken({
        installation_id: parseInt(installationId),
      });

      console.log('[GitHub Service] Installation 토큰 생성 성공:', {
        tokenLength: data.token.length,
        expiresAt: data.expires_at,
      });

      return data.token;
    } catch (error) {
      console.error('[GitHub Service] Installation 토큰 생성 실패:', {
        installationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new BadRequestException(
        `GitHub 설치 ${installationId}에 접근할 수 없습니다. 설치가 유효한지 확인해주세요.`,
      );
    }
  }

  private async getInstallationOctokit(
    installationId: string,
  ): Promise<Octokit> {
    const installationToken = await this.getInstallationToken(installationId);

    return new Octokit({
      auth: installationToken,
    });
  }

  async getAccessibleRepositories(
    installationId: string,
  ): Promise<GetRepositoriesResponseDto> {
    const octokit = await this.getInstallationOctokit(installationId);

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

    // 검증된 수동 토큰 방식 사용
    const octokit = await this.getInstallationOctokit(installationId);

    try {
      console.log('[GitHub Service] Fetching branches:', {
        installationId,
        repoFullName,
        owner,
        repo,
      });

      const { data } = await octokit.rest.repos.listBranches({
        owner,
        repo,
        per_page: 100,
      });

      console.log('[GitHub Service] Branches fetched successfully:', {
        repoFullName,
        branchCount: data.length,
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
    } catch (error: unknown) {
      console.error('[GitHub Service] Error fetching branches:', {
        installationId,
        repoFullName,
        owner,
        repo,
        error:
          error instanceof Error
            ? {
                message: error.message,
                name: error.name,
                stack: error.stack?.substring(0, 500),
              }
            : error,
      });
      throw new BadRequestException(
        `${repoFullName}의 브랜치 목록을 가져오는데 실패했습니다: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
      console.log('[GitHub API] Installation 검증 시작:', {
        installationId,
        appId: this.appId,
      });

      // 1. JWT 토큰 생성
      const jwtToken = this.generateJWT();

      // 2. JWT로 Octokit 인스턴스 생성
      const octokit = new Octokit({
        auth: jwtToken,
      });

      console.log('[GitHub API] Octokit 인스턴스 생성 완료 (JWT 사용)');

      // 3. Installation 정보 조회
      const { data } = await octokit.rest.apps.getInstallation({
        installation_id: parseInt(installationId),
      });

      // GitHub API 응답에서 account 정보 추출
      const account = data.account;
      if (!account) {
        throw new Error('Installation account 정보가 없습니다');
      }

      // account 타입에 따라 login 필드 접근
      const accountLogin = 'login' in account ? account.login : account.name;
      const accountId = account.id;
      const accountType = 'type' in account ? account.type : 'Organization';

      console.log('[GitHub API] Installation 조회 성공:', {
        id: data.id,
        accountLogin,
        accountType,
      });

      return {
        id: data.id,
        account: {
          login: accountLogin,
          id: accountId,
          type: accountType as 'User' | 'Organization',
        },
        permissions: data.permissions || {},
        createdAt: data.created_at,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : '';

      console.error('[GitHub API] Installation 조회 실패:', {
        installationId,
        appId: this.appId,
        error: errorMessage,
        stack: errorStack?.substring(0, 500),
      });
      throw new BadRequestException('유효하지 않은 GitHub 설치 ID입니다');
    }
  }
}

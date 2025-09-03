import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { Octokit } from '@octokit/rest';
import type { RegisterGithubAppDto } from '@github/dtos/request/register-github-app.dto';

/**
 * 깃허브 앱 연동 서비스
 * - 설치 정보 저장
 * - Octokit으로 API 호출
 * - Webhook 이벤트 처리
 */
@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 깃허브 앱 설치 정보 저장 및 레포지토리 목록 조회
   */
  async registerApp(user: { userID: string }, dto: RegisterGithubAppDto) {
    try {
      this.logger.log(
        `GitHub 앱 등록 시작 - 사용자: ${user.userID}, 설치 ID: ${dto.installationId}`,
      );

      // 1. GitHub API 토큰 검증
      const octokit = new Octokit({ auth: dto.accessToken });

      // 2. 설치된 레포지토리 목록 조회
      const { data: installation } = await octokit.rest.apps.getInstallation({
        installation_id: parseInt(dto.installationId),
      });

      const { data: reposData } =
        await octokit.rest.apps.listReposAccessibleToInstallation();

      // 3. DB에 설치 정보 저장/업데이트
      await this.prisma.github.upsert({
        where: { userID: user.userID },
        update: {
          installationId: dto.installationId,
          accessToken: dto.accessToken,
        },
        create: {
          userID: user.userID,
          installationId: dto.installationId,
          accessToken: dto.accessToken,
        },
      });

      // 4. 레포지토리 정보를 프론트엔드 형식에 맞게 변환
      const repositories = reposData.repositories.map((repo) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        private: repo.private,
        html_url: repo.html_url,
        default_branch: repo.default_branch,
      }));

      this.logger.log(
        `GitHub 앱 등록 완료 - 사용자: ${user.userID}, 레포지토리 수: ${repositories.length}`,
      );

      return {
        success: true,
        repositories,
      };
    } catch (error) {
      this.logger.error(`GitHub 앱 등록 실패 - 사용자: ${user.userID}`, error);

      if (error.status === 401) {
        throw new UnauthorizedException(
          'GitHub 액세스 토큰이 유효하지 않습니다.',
        );
      }

      throw new BadRequestException('GitHub 앱 등록에 실패했습니다.');
    }
  }

  /**
   * 깃허브 Webhook 이벤트 처리
   */
  async handleWebhookEvent(event: any) {
    try {
      this.logger.log(
        `GitHub Webhook 이벤트 수신: ${event.action || 'unknown'}`,
      );

      // GitHub App 설치 이벤트 처리
      if (event.action === 'created' && event.installation) {
        this.logger.log(
          `GitHub App 설치 완료 - 설치 ID: ${event.installation.id}`,
        );
        // 설치 완료 후 프론트엔드에 알림을 위한 로직 추가 가능
      }

      // GitHub App 제거 이벤트 처리
      if (event.action === 'deleted' && event.installation) {
        this.logger.log(`GitHub App 제거 - 설치 ID: ${event.installation.id}`);
        // 관련 데이터 정리 로직 추가 가능
      }

      return { received: true };
    } catch (error) {
      this.logger.error('GitHub Webhook 이벤트 처리 실패', error);
      return { received: false, error: error.message };
    }
  }
  /**
   * 특정 레포의 브랜치 목록을 조회
   * @param user 로그인된 사용자 정보
   * @param repo 전체 레포 이름 (owner/repo)
   * @returns 브랜치 정보 배열
   */
  async getBranches(user: { userID: string }, repo: string) {
    try {
      this.logger.log(
        `브랜치 목록 조회 시작 - 사용자: ${user.userID}, 레포: ${repo}`,
      );

      // 1. 사용자 GitHub 인증 정보 조회
      const github = await this.prisma.github.findUnique({
        where: { userID: user.userID },
      });

      if (!github?.accessToken) {
        throw new UnauthorizedException(
          'GitHub 인증 정보가 없습니다. 먼저 GitHub 앱을 설치해주세요.',
        );
      }

      // 2. Octokit 인스턴스 생성
      const octokit = new Octokit({ auth: github.accessToken });

      // 3. 레포지토리 이름 파싱
      const [owner, repoName] = repo.split('/');
      if (!owner || !repoName) {
        throw new BadRequestException(
          '잘못된 레포지토리 이름 형식입니다. (owner/repo 형식으로 입력해주세요)',
        );
      }

      // 4. 브랜치 목록 조회
      const { data: branches } = await octokit.rest.repos.listBranches({
        owner,
        repo: repoName,
      });

      // 5. 브랜치 정보를 프론트엔드 형식에 맞게 변환
      const branchList = branches.map((branch) => ({
        name: branch.name,
        commit: {
          sha: branch.commit.sha,
          url: branch.commit.url,
        },
        protected: branch.protected || false,
      }));

      this.logger.log(
        `브랜치 목록 조회 완료 - 사용자: ${user.userID}, 레포: ${repo}, 브랜치 수: ${branchList.length}`,
      );

      return branchList;
    } catch (error) {
      this.logger.error(
        `브랜치 목록 조회 실패 - 사용자: ${user.userID}, 레포: ${repo}`,
        error,
      );

      if (error.status === 404) {
        throw new BadRequestException('레포지토리를 찾을 수 없습니다.');
      }

      if (error.status === 403) {
        throw new UnauthorizedException(
          '해당 레포지토리에 접근 권한이 없습니다.',
        );
      }

      throw new BadRequestException('브랜치 목록을 가져올 수 없습니다.');
    }
  }

  /**
   * 선택한 브랜치 등록 (프로젝트와 연결하여 DB 저장)
   * @param user 로그인된 사용자 정보
   * @param repo 전체 레포 이름
   * @param branch 선택한 브랜치명
   * @returns 등록 결과
   */
  async registerBranch(user: { userID: string }, repo: string, branch: string) {
    try {
      this.logger.log(
        `브랜치 등록 시작 - 사용자: ${user.userID}, 레포: ${repo}, 브랜치: ${branch}`,
      );

      // 1. 사용자의 기본 프로젝트 조회 (또는 프로젝트 ID를 파라미터로 받을 수 있음)
      const project = await this.prisma.project.findFirst({
        where: { userID: user.userID },
        orderBy: { createdAt: 'desc' }, // 가장 최근 프로젝트 사용
      });

      if (!project) {
        throw new BadRequestException(
          '등록된 프로젝트가 없습니다. 먼저 프로젝트를 생성해주세요.',
        );
      }

      // 2. GitHub 인증 정보 확인
      const github = await this.prisma.github.findUnique({
        where: { userID: user.userID },
      });

      if (!github?.accessToken) {
        throw new UnauthorizedException('GitHub 인증 정보가 없습니다.');
      }

      // 3. 브랜치 존재 여부 확인
      const [owner, repoName] = repo.split('/');
      const octokit = new Octokit({ auth: github.accessToken });

      try {
        await octokit.rest.repos.getBranch({
          owner,
          repo: repoName,
          branch,
        });
      } catch (error) {
        if (error.status === 404) {
          throw new BadRequestException('해당 브랜치를 찾을 수 없습니다.');
        }
        throw error;
      }

      // 4. 프로젝트-레포지토리 연결 정보 저장/업데이트
      await this.prisma.projectRepository.upsert({
        where: {
          projectID_repoFullName: {
            projectID: project.projectID,
            repoFullName: repo,
          },
        },
        update: {
          selectedBranch: branch,
          isActive: true,
        },
        create: {
          projectID: project.projectID,
          repoFullName: repo,
          selectedBranch: branch,
          isActive: true,
        },
      });

      this.logger.log(
        `브랜치 등록 완료 - 사용자: ${user.userID}, 프로젝트: ${project.projectID}, 레포: ${repo}, 브랜치: ${branch}`,
      );

      return {
        success: true,
        message: '브랜치가 성공적으로 등록되었습니다.',
      };
    } catch (error) {
      this.logger.error(
        `브랜치 등록 실패 - 사용자: ${user.userID}, 레포: ${repo}, 브랜치: ${branch}`,
        error,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      throw new BadRequestException('브랜치 등록에 실패했습니다.');
    }
  }
}

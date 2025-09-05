import {
    Injectable,
    Logger,
    BadRequestException,
    UnauthorizedException,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { Octokit } from '@octokit/rest';
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

/**
 * GitHub 통합 서비스
 * - GitHub 계정 등록 및 관리
 * - 레포지토리 및 브랜치 정보 조회
 * - 프로젝트와 GitHub 리소스 연결
 */
@Injectable()
export class GithubService {
    private readonly logger = new Logger(GithubService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * 1단계: GitHub 계정 등록
     * - GitHub App 설치 후 installationId와 accessToken을 받아서 등록
     * - installationId 기준으로 upsert (동일한 GitHub App 설치를 여러 사용자가 사용 가능)
     * - 등록된 계정의 접근 가능한 레포지토리 목록 반환
     */
    async registerGithubApp(
        user: { userID: string },
        dto: RegisterGithubAppDto
    ): Promise<GithubAppRegisterResponseDto> {
        try {
            this.logger.log(
                `GitHub 계정 등록 시작 - 사용자: ${user.userID}, 설치 ID: ${dto.installationId}`,
            );

            // 1. GitHub API 토큰 검증 및 설치 정보 조회
            const octokit = new Octokit({ auth: dto.accessToken });

            const { data: installation } = await octokit.rest.apps.getInstallation({
                installation_id: parseInt(dto.installationId),
            });

            // 2. 접근 가능한 레포지토리 목록 조회
            const { data: reposData } = await octokit.rest.apps.listReposAccessibleToInstallation();

            // 3. GitHub 설치 정보 저장/업데이트 (installationId 기준 upsert)
            await this.prisma.githubInstallation.upsert({
                where: { installationId: dto.installationId },
                update: {
                    userID: user.userID,
                    accessToken: dto.accessToken,
                    accountLogin: (installation.account as any)?.login || null,
                    accountId: (installation.account as any)?.id ? BigInt((installation.account as any).id) : null,
                    lastUsedAt: new Date(),
                },
                create: {
                    userID: user.userID,
                    installationId: dto.installationId,
                    accessToken: dto.accessToken,
                    accountLogin: (installation.account as any)?.login || null,
                    accountId: (installation.account as any)?.id ? BigInt((installation.account as any).id) : null,
                    lastUsedAt: new Date(),
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
                `GitHub 계정 등록 완료 - 사용자: ${user.userID}, 설치 ID: ${dto.installationId}, 레포지토리 수: ${repositories.length}`,
            );

            return {
                success: true,
                installationId: dto.installationId,
                repositories,
                message: `${repositories.length}개의 레포지토리를 찾았습니다.`,
            };
        } catch (error) {
            this.logger.error(`GitHub 계정 등록 실패 - 사용자: ${user.userID}`, error);

            if (error.status === 401) {
                throw new UnauthorizedException(
                    'GitHub 액세스 토큰이 유효하지 않습니다.',
                );
            }

            throw new BadRequestException('GitHub 계정 등록에 실패했습니다.');
        }
    }

    /**
     * 2단계: 레포지토리 목록 조회
     * - 사용자의 등록된 GitHub 계정들에서 접근 가능한 레포지토리 목록 조회
     * - 여러 GitHub 계정을 등록한 경우 모든 계정의 레포지토리를 통합하여 반환
     */
    async getRepositories(user: { userID: string }): Promise<GithubAppRegisterResponseDto> {
        try {
            this.logger.log(`레포지토리 목록 조회 시작 - 사용자: ${user.userID}`);

            // 1. 사용자의 GitHub 설치 정보들 조회
            const installations = await this.prisma.githubInstallation.findMany({
                where: { userID: user.userID },
                orderBy: { lastUsedAt: 'desc' },
            });

            if (installations.length === 0) {
                throw new UnauthorizedException(
                    '등록된 GitHub 계정이 없습니다. 먼저 GitHub 계정을 등록해주세요.',
                );
            }

            // 2. 모든 GitHub 계정의 레포지토리 통합 조회
            const allRepositories: any[] = [];

            for (const installation of installations) {
                if (!installation.accessToken) continue;

                try {
                    const octokit = new Octokit({ auth: installation.accessToken });
                    const { data: reposData } = await octokit.rest.apps.listReposAccessibleToInstallation();

                    const repositories = reposData.repositories.map((repo) => ({
                        id: repo.id,
                        name: repo.name,
                        full_name: repo.full_name,
                        description: repo.description,
                        private: repo.private,
                        html_url: repo.html_url,
                        default_branch: repo.default_branch,
                        installationId: installation.installationId, // 어떤 계정에서 가져온 레포인지 표시
                    }));

                    allRepositories.push(...repositories);
                } catch (error) {
                    this.logger.warn(
                        `GitHub 계정 ${installation.installationId}의 레포지토리 조회 실패`,
                        error,
                    );
                }
            }

            this.logger.log(
                `레포지토리 목록 조회 완료 - 사용자: ${user.userID}, 총 레포지토리 수: ${allRepositories.length}`,
            );

            return {
                success: true,
                installationId: installations[0].installationId, // 가장 최근 사용한 계정 ID
                repositories: allRepositories,
                message: `${allRepositories.length}개의 레포지토리를 찾았습니다.`,
            };
        } catch (error) {
            this.logger.error(`레포지토리 목록 조회 실패 - 사용자: ${user.userID}`, error);

            if (error instanceof UnauthorizedException) {
                throw error;
            }

            throw new BadRequestException('레포지토리 목록을 가져올 수 없습니다.');
        }
    }

    /**
     * 3단계: 레포지토리 선택
     * - 사용자가 선택한 레포지토리를 프로젝트에 연결
     * - ProjectRepository 테이블에 프로젝트-레포-계정 연결 정보 저장
     */
    async selectRepository(
        user: { userID: string },
        dto: SelectRepositoryDto
    ): Promise<SelectRepositoryResponseDto> {
        try {
            this.logger.log(
                `레포지토리 선택 시작 - 사용자: ${user.userID}, 프로젝트: ${dto.projectID}, 레포: ${dto.repoFullName}`,
            );

            // 1. 프로젝트 소유권 확인
            const project = await this.prisma.project.findFirst({
                where: {
                    projectID: dto.projectID,
                    userID: user.userID,
                },
            });

            if (!project) {
                throw new NotFoundException('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.');
            }

            // 2. GitHub 설치 정보 확인
            const installation = await this.prisma.githubInstallation.findUnique({
                where: { installationId: dto.installationId },
            });

            if (!installation || installation.userID !== user.userID) {
                throw new UnauthorizedException('유효하지 않은 GitHub 설치 정보입니다.');
            }

            // 3. 레포지토리 존재 여부 확인 (GitHub API로 검증)
            if (!installation.accessToken) {
                throw new UnauthorizedException('GitHub 액세스 토큰이 없습니다.');
            }

            const octokit = new Octokit({ auth: installation.accessToken });
            const [owner, repoName] = dto.repoFullName.split('/');

            try {
                await octokit.rest.repos.get({
                    owner,
                    repo: repoName,
                });
            } catch (error) {
                if (error.status === 404) {
                    throw new NotFoundException('해당 레포지토리를 찾을 수 없습니다.');
                }
                throw error;
            }

            // 4. 프로젝트-레포지토리 연결 정보 저장/업데이트
            await this.prisma.projectRepository.upsert({
                where: {
                    projectID_repoFullName: {
                        projectID: dto.projectID,
                        repoFullName: dto.repoFullName,
                    },
                },
                update: {
                    selectedBranch: 'main', // 기본 브랜치로 설정 (나중에 변경 가능)
                    isActive: true,
                },
                create: {
                    projectID: dto.projectID,
                    repoFullName: dto.repoFullName,
                    selectedBranch: 'main', // 기본 브랜치로 설정
                    isActive: true,
                },
            });

            this.logger.log(
                `레포지토리 선택 완료 - 사용자: ${user.userID}, 프로젝트: ${dto.projectID}, 레포: ${dto.repoFullName}`,
            );

            return {
                success: true,
                projectID: dto.projectID,
                repoFullName: dto.repoFullName,
                installationId: dto.installationId,
                message: '레포지토리가 성공적으로 선택되었습니다.',
            };
        } catch (error) {
            this.logger.error(
                `레포지토리 선택 실패 - 사용자: ${user.userID}, 프로젝트: ${dto.projectID}, 레포: ${dto.repoFullName}`,
                error,
            );

            if (
                error instanceof NotFoundException ||
                error instanceof UnauthorizedException
            ) {
                throw error;
            }

            throw new BadRequestException('레포지토리 선택에 실패했습니다.');
        }
    }

    /**
     * 4단계: 브랜치 목록 조회
     * - 선택된 레포지토리의 브랜치 목록 조회
     * - 해당 레포지토리에 접근 권한이 있는 GitHub 계정을 사용
     */
    async getBranches(
        user: { userID: string },
        repoFullName: string
    ): Promise<BranchInfoResponseDto> {
        try {
            this.logger.log(
                `브랜치 목록 조회 시작 - 사용자: ${user.userID}, 레포: ${repoFullName}`,
            );

            // 1. 프로젝트-레포지토리 연결 정보 확인
            const projectRepo = await this.prisma.projectRepository.findFirst({
                where: {
                    repoFullName,
                    project: { userID: user.userID }, // 사용자의 프로젝트인지 확인
                },
                include: { project: true },
            });

            if (!projectRepo) {
                throw new NotFoundException('해당 레포지토리가 프로젝트에 연결되지 않았습니다.');
            }

            // 2. GitHub 설치 정보 조회 (사용자의 모든 계정에서 해당 레포에 접근 가능한 계정 찾기)
            const installations = await this.prisma.githubInstallation.findMany({
                where: { userID: user.userID },
                orderBy: { lastUsedAt: 'desc' },
            });

            let branches: any[] = [];
            let foundAccessibleAccount = false;

            for (const installation of installations) {
                if (!installation.accessToken) continue;

                try {
                    const octokit = new Octokit({ auth: installation.accessToken });
                    const [owner, repoName] = repoFullName.split('/');

                    const { data: branchesData } = await octokit.rest.repos.listBranches({
                        owner,
                        repo: repoName,
                    });

                    branches = branchesData.map((branch) => ({
                        name: branch.name,
                        commit: {
                            sha: branch.commit.sha,
                            url: branch.commit.url,
                        },
                        protected: branch.protected || false,
                    }));

                    foundAccessibleAccount = true;
                    break; // 접근 가능한 계정을 찾았으면 중단
                } catch (error) {
                    this.logger.warn(
                        `GitHub 계정 ${installation.installationId}에서 레포 ${repoFullName} 접근 실패`,
                        error,
                    );
                }
            }

            if (!foundAccessibleAccount) {
                throw new UnauthorizedException(
                    '해당 레포지토리에 접근할 수 있는 GitHub 계정이 없습니다.',
                );
            }

            this.logger.log(
                `브랜치 목록 조회 완료 - 사용자: ${user.userID}, 레포: ${repoFullName}, 브랜치 수: ${branches.length}`,
            );

            return {
                branches,
                repoFullName,
            };
        } catch (error) {
            this.logger.error(
                `브랜치 목록 조회 실패 - 사용자: ${user.userID}, 레포: ${repoFullName}`,
                error,
            );

            if (
                error instanceof NotFoundException ||
                error instanceof UnauthorizedException
            ) {
                throw error;
            }

            throw new BadRequestException('브랜치 목록을 가져올 수 없습니다.');
        }
    }

    /**
     * 5단계: 브랜치 선택
     * - 선택된 브랜치를 ProjectRepository.selectedBranch에 저장
     */
    async selectBranch(
        user: { userID: string },
        dto: SelectBranchDto
    ): Promise<SelectBranchResponseDto> {
        try {
            this.logger.log(
                `브랜치 선택 시작 - 사용자: ${user.userID}, 프로젝트: ${dto.projectID}, 레포: ${dto.repoFullName}, 브랜치: ${dto.branchName}`,
            );

            // 1. 프로젝트-레포지토리 연결 정보 확인
            const projectRepo = await this.prisma.projectRepository.findFirst({
                where: {
                    projectID: dto.projectID,
                    repoFullName: dto.repoFullName,
                    project: { userID: user.userID }, // 사용자의 프로젝트인지 확인
                },
            });

            if (!projectRepo) {
                throw new NotFoundException('해당 레포지토리가 프로젝트에 연결되지 않았습니다.');
            }

            // 2. 브랜치 존재 여부 확인 (GitHub API로 검증)
            const installations = await this.prisma.githubInstallation.findMany({
                where: { userID: user.userID },
                orderBy: { lastUsedAt: 'desc' },
            });

            let branchExists = false;
            for (const installation of installations) {
                if (!installation.accessToken) continue;

                try {
                    const octokit = new Octokit({ auth: installation.accessToken });
                    const [owner, repoName] = dto.repoFullName.split('/');

                    await octokit.rest.repos.getBranch({
                        owner,
                        repo: repoName,
                        branch: dto.branchName,
                    });

                    branchExists = true;
                    break;
                } catch (error) {
                    // 계속 다음 계정 시도
                }
            }

            if (!branchExists) {
                throw new NotFoundException('해당 브랜치를 찾을 수 없습니다.');
            }

            // 3. 선택된 브랜치 저장
            await this.prisma.projectRepository.update({
                where: {
                    projectID_repoFullName: {
                        projectID: dto.projectID,
                        repoFullName: dto.repoFullName,
                    },
                },
                data: {
                    selectedBranch: dto.branchName,
                },
            });

            this.logger.log(
                `브랜치 선택 완료 - 사용자: ${user.userID}, 프로젝트: ${dto.projectID}, 레포: ${dto.repoFullName}, 브랜치: ${dto.branchName}`,
            );

            return {
                success: true,
                projectID: dto.projectID,
                repoFullName: dto.repoFullName,
                branchName: dto.branchName,
                message: '브랜치가 성공적으로 선택되었습니다.',
            };
        } catch (error) {
            this.logger.error(
                `브랜치 선택 실패 - 사용자: ${user.userID}, 프로젝트: ${dto.projectID}, 레포: ${dto.repoFullName}, 브랜치: ${dto.branchName}`,
                error,
            );

            if (error instanceof NotFoundException) {
                throw error;
            }

            throw new BadRequestException('브랜치 선택에 실패했습니다.');
        }
    }
}

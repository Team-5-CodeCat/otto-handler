import { Controller, Post, Body, Req, UseGuards, HttpCode, Headers, Logger, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { GithubService } from '@github/services/github.service';
import type { RegisterGithubAppDto, RegisterBranchDto, InstallationCallbackDto } from '@github/dtos';
import { AuthGuard } from '@common/guards/auth.guard';

/**
 * 깃허브 앱 연동 컨트롤러
 */
@Controller('integrations/github')
export class GithubController {
    private readonly logger = new Logger(GithubController.name);

    constructor(private readonly githubService: GithubService) { }

    /**
     * GitHub 앱 설치 URL 조회
     * GET /api/integrations/github/install/url
     */
    @UseGuards(AuthGuard)
    @Get('install/url')
    async getInstallationUrl(@Req() req: any) {
        try {
            this.logger.log(`GitHub 앱 설치 URL 요청 - 사용자: ${req.user.userID}`);
            
            const githubAppId = process.env.GITHUB_APP_ID;
            const callbackUrl = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/integrations/github/install/callback`;
            
            if (!githubAppId) {
                throw new HttpException('GitHub App ID가 설정되지 않았습니다.', HttpStatus.INTERNAL_SERVER_ERROR);
            }
            
            const installUrl = `https://github.com/apps/${process.env.GITHUB_APP_NAME || 'otto-handler'}/installations/new?state=${req.user.userID}`;
            
            this.logger.log(`GitHub 앱 설치 URL 생성 완료 - 사용자: ${req.user.userID}`);
            
            return {
                installUrl,
                callbackUrl
            };
        } catch (error) {
            this.logger.error(`GitHub 앱 설치 URL 생성 실패 - 사용자: ${req.user.userID}`, error);
            throw error;
        }
    }

    /**
     * 깃허브 앱 등록 (로그인 필요)
     * POST /api/integrations/github/register
     */
    @UseGuards(AuthGuard)
    @HttpCode(200)
    @Post('register')
    async registerGithubApp(
        @Body() body: RegisterGithubAppDto,
        @Req() req: any,
    ) {
        try {
            this.logger.log(`GitHub 앱 등록 요청 - 사용자: ${req.user.userID}`);
            
            const result = await this.githubService.registerApp(req.user, body);
            
            this.logger.log(`GitHub 앱 등록 성공 - 사용자: ${req.user.userID}, 레포지토리 수: ${result.repositories.length}`);
            
            return result;
        } catch (error) {
            this.logger.error(`GitHub 앱 등록 실패 - 사용자: ${req.user.userID}`, error);
            throw error;
        }
    }

    /**
     * 특정 레포의 브랜치 목록 조회
     * GET /api/integrations/github/branches?repo=<repo_full_name>
     * @param repo ex) Team-5-CodeCat/otto-handler
     * @returns 브랜치 정보 배열
     */
    @UseGuards(AuthGuard)
    @Get('branches')
    async getBranches(
        @Req() req: any,
        @Query('repo') repo: string,
    ) {
        try {
            if (!repo) {
                throw new HttpException('repo 파라미터가 필요합니다.', HttpStatus.BAD_REQUEST);
            }

            this.logger.log(`브랜치 목록 조회 요청 - 사용자: ${req.user.userID}, 레포: ${repo}`);
            
            const branches = await this.githubService.getBranches(req.user, repo);
            
            this.logger.log(`브랜치 목록 조회 성공 - 사용자: ${req.user.userID}, 레포: ${repo}, 브랜치 수: ${branches.length}`);
            
            return branches;
        } catch (error) {
            this.logger.error(`브랜치 목록 조회 실패 - 사용자: ${req.user.userID}, 레포: ${repo}`, error);
            throw error;
        }
    }

    /**
     * 선택한 브랜치 등록 (1개만 등록, 프론트에서 단일 선택 제한)
     * POST /api/integrations/github/branches
     * @param repo 레포 전체 이름
     * @param branch 선택한 브랜치명
     */
    @UseGuards(AuthGuard)
    @Post('branches')
    async registerBranch(
        @Req() req: any,
        @Body() body: RegisterBranchDto,
    ) {
        try {
            if (!body.repo || !body.branch) {
                throw new HttpException('repo와 branch 파라미터가 필요합니다.', HttpStatus.BAD_REQUEST);
            }

            this.logger.log(`브랜치 등록 요청 - 사용자: ${req.user.userID}, 레포: ${body.repo}, 브랜치: ${body.branch}`);
            
            const result = await this.githubService.registerBranch(req.user, body.repo, body.branch);
            
            this.logger.log(`브랜치 등록 성공 - 사용자: ${req.user.userID}, 레포: ${body.repo}, 브랜치: ${body.branch}`);
            
            return result;
        } catch (error) {
            this.logger.error(`브랜치 등록 실패 - 사용자: ${req.user.userID}, 레포: ${body.repo}, 브랜치: ${body.branch}`, error);
            throw error;
        }
    }

    /**
     * GitHub 앱 설치 콜백 처리
     * GET /api/integrations/github/install/callback
     */
    @Get('install/callback')
    async installationCallback(
        @Query() query: InstallationCallbackDto,
    ) {
        try {
            this.logger.log(`GitHub 앱 설치 콜백 수신 - 설치 ID: ${query.installation_id}, 액션: ${query.setup_action}`);
            
            // 설치 완료 후 프론트엔드로 리다이렉트
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const redirectUrl = `${frontendUrl}/projects/new?github_installed=true&installation_id=${query.installation_id}`;
            
            this.logger.log(`프론트엔드로 리다이렉트: ${redirectUrl}`);
            
            return { redirect: redirectUrl };
        } catch (error) {
            this.logger.error(`GitHub 앱 설치 콜백 처리 실패`, error);
            throw error;
        }
    }

    /**
     * 깃허브 Webhook 이벤트 수신
     * POST /api/integrations/github/webhook
     */
    @Post('webhook')
    async githubWebhook(
        @Body() event: any,
        @Headers('x-github-event') eventType: string,
    ) {
        try {
            this.logger.log(`GitHub Webhook 이벤트 수신: ${eventType}`);
            
            const result = await this.githubService.handleWebhookEvent(event);
            
            this.logger.log(`GitHub Webhook 이벤트 처리 완료: ${eventType}`);
            
            return result;
        } catch (error) {
            this.logger.error(`GitHub Webhook 이벤트 처리 실패: ${eventType}`, error);
            throw error;
        }
    }
}

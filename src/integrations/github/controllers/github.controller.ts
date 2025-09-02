import { Controller, Post, Body, Req, UseGuards, HttpCode, Headers, Logger } from '@nestjs/common';
import { GithubService } from '../services/github.service';
import type { RegisterGithubAppDto } from '../dtos/request/register-github-app.dto';
import { AuthGuard } from '../../../common/guards/auth.guard'; // 실제 경로에 맞게 수정 필요

/**
 * 깃허브 앱 연동 컨트롤러
 * - 앱 등록
 * - Webhook 이벤트 수신
 */
@Controller('integrations/github')
export class GithubController {
  private readonly logger = new Logger(GithubController.name);

  constructor(private readonly githubService: GithubService) {}

  /**
   * @tag github
   * 깃허브 앱 등록 (로그인 필요)
   * 프론트엔드에서 installationId 등 전달
   */
  @UseGuards(AuthGuard)
  @HttpCode(200)
  @Post('register')
  async registerGithubApp(
    @Body() body: RegisterGithubAppDto,
    @Req() req: any, // req.user에 로그인 정보가 있다고 가정
  ) {
    return await this.githubService.registerApp(req.user, body);
  }

  /**
   * 깃허브 Webhook 이벤트 수신 엔드포인트
   * 깃허브 앱 설정에서 이 URL로 Webhook을 등록해야 함
   */
  @Post('webhook')
  async githubWebhook(
    @Body() event: any,
    @Headers('x-github-event') eventType: string,
  ) {
    this.logger.log(`Received GitHub webhook event: ${eventType}`);
    // 실제 이벤트 처리 로직은 서비스로 위임
    return await this.githubService.handleWebhookEvent(event);
  }
}

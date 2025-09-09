import { Controller, HttpCode, HttpStatus } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { ProjectService } from '../projects/services/project.service';
import {
  TypedBody,
  TypedException,
  TypedRoute,
  TypedHeaders,
} from '@nestia/core';
import type { GithubWebhookRequestDto, WebhookResponseDto } from './dtos';
import type { CommonErrorResponseDto } from '../common/dto/response/common-error-response.dto';

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly projectService: ProjectService) {}

  /**
   * @tag webhook
   * @summary GitHub 웹훅 엔드포인트 확인 (GET)
   */
  @HttpCode(200)
  @TypedRoute.Get('github')
  handleGithubWebhookGet(): WebhookResponseDto {
    return { ok: true, message: 'GitHub webhook endpoint is ready' };
  }

  /**
   * @tag webhook
   * @summary GitHub 웹훅 이벤트 처리 (POST)
   */
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.BAD_REQUEST,
    description: '잘못된 요청 또는 서명 검증 실패',
  })
  @HttpCode(200)
  @TypedRoute.Post('github')
  async handleGithubWebhook(
    @TypedBody() payload: GithubWebhookRequestDto,
    @TypedHeaders()
    headers: {
      'x-github-event': string;
      'x-github-delivery': string;
      'x-hub-signature-256': string;
    },
  ): Promise<WebhookResponseDto> {
    const {
      'x-github-event': event,
      'x-github-delivery': delivery,
      'x-hub-signature-256': signature,
    } = headers;

    if (!this.verifyGithubSignature(payload, signature)) {
      return { ok: false, message: 'Invalid signature' };
    }

    if (event === 'installation') {
      this.handleInstallationEvent(payload);
    } else if (event === 'push') {
      await this.handlePushEvent(payload);
    } else if (event === 'pull_request') {
      await this.handlePullRequestEvent(payload);
    }

    void delivery;
    return { ok: true };
  }

  private handleInstallationEvent(payload: GithubWebhookRequestDto) {
    const action = payload.action;
    if (action === 'deleted' || action === 'suspend') {
      return;
    }
  }

  private async handlePushEvent(payload: GithubWebhookRequestDto) {
    const fullName = payload.repository?.full_name;
    const installationId = String(payload.installation?.id ?? '');
    const pushedBranch = payload.ref?.replace('refs/heads/', '');

    if (!fullName || !installationId || !pushedBranch) return;

    const projects = await this.projectService.findProjectsByRepository(
      fullName,
      installationId,
    );

    // 선택된 브랜치와 일치하는 프로젝트만 필터링
    const matchingProjects = projects.filter(
      (pr) => pr.selectedBranch === pushedBranch,
    );

    if (matchingProjects.length === 0) {
      console.log(`[Webhook] No projects found for branch: ${pushedBranch}`);
      return;
    }

    console.log(
      `[Webhook] Triggering pipeline for ${matchingProjects.length} projects on branch: ${pushedBranch}`,
    );

    await Promise.all(
      matchingProjects.map((pr) =>
        this.projectService.createBuildRecord(pr.project.projectID, {
          trigger: 'webhook:push',
          metadata: {
            ref: payload.ref,
            after: payload.after,
            branch: pushedBranch,
            repository: fullName,
          },
        }),
      ),
    );
  }

  private async handlePullRequestEvent(payload: GithubWebhookRequestDto) {
    const fullName = payload.repository?.full_name;
    const installationId = String(payload.installation?.id ?? '');
    if (!fullName || !installationId) return;

    const projects = await this.projectService.findProjectsByRepository(
      fullName,
      installationId,
    );
    await Promise.all(
      projects.map((pr) =>
        this.projectService.createBuildRecord(pr.project.projectID, {
          trigger: 'webhook:pull_request',
          metadata: { action: payload.action },
        }),
      ),
    );
  }

  private verifyGithubSignature(
    body: GithubWebhookRequestDto,
    signature: string,
  ): boolean {
    const secret = process.env.GITHUB_WEBHOOK_SECRET || '';
    if (!secret || !signature) return false;
    const payload = JSON.stringify(body);
    const digest = `sha256=${createHmac('sha256', secret)
      .update(payload)
      .digest('hex')}`;
    try {
      return timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
    } catch {
      return false;
    }
  }
}

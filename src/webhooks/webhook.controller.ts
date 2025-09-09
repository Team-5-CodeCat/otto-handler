import { Controller, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { ProjectService } from '../projects/services/project.service';
import {
  TypedBody,
  TypedException,
  TypedRoute,
  TypedHeaders,
} from '@nestia/core';
import type { FastifyRequest } from 'fastify';
import type { GithubWebhookRequestDto, WebhookResponseDto } from './dtos';
import type { CommonErrorResponseDto } from '../common/dto/response/common-error-response.dto';

@Controller('/webhooks')
export class WebhookController {
  constructor(private readonly projectService: ProjectService) {}

  @HttpCode(200)
  @TypedRoute.Get('/github')
  handleGithubWebhookGet(): WebhookResponseDto {
    return { ok: true, message: 'GitHub webhook endpoint is ready' };
  }

  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.BAD_REQUEST,
    description: '잘못된 요청 또는 서명 검증 실패',
  })
  @HttpCode(200)
  @TypedRoute.Post('/github')
  async handleGithubWebhook(
    @TypedBody() payload: GithubWebhookRequestDto,
    @TypedHeaders()
    headers: {
      'x-github-event': string;
      'x-github-delivery': string;
      'x-hub-signature-256': string;
    },
    @Req() request: FastifyRequest & { rawBody?: string },
  ): Promise<WebhookResponseDto> {
    const { 'x-github-event': event, 'x-github-delivery': delivery } = headers;

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '[Webhook] Development mode: skipping signature verification',
      );
    } else {
      const signature = headers['x-hub-signature-256'];
      const rawBody = request.rawBody ?? JSON.stringify(payload);
      if (!this.verifyGithubSignature(rawBody, signature)) {
        console.log('[Webhook] Signature verification failed');
        return { ok: false, message: 'Invalid signature' };
      }
    }

    console.log(`[Webhook] Processing ${event} event (delivery: ${delivery})`);

    if (event === 'installation') {
      await this.handleInstallationEvent(payload);
    } else if (event === 'push') {
      await this.handlePushEvent(payload);
    } else if (event === 'pull_request') {
      await this.handlePullRequestEvent(payload);
    } else {
      console.log(`[Webhook] Unhandled event type: ${event}`);
    }

    return { ok: true };
  }

  private async handleInstallationEvent(payload: GithubWebhookRequestDto) {
    const action = payload.action;
    const installation = payload.installation;

    if (!installation || !installation.account) {
      console.log('[Webhook] No installation or account data in payload');
      return;
    }

    let accountLogin = 'unknown';
    if (this.isValidAccount(installation.account)) {
      // 타입 단언으로 ESLint 경고 제거
      accountLogin = (installation.account as { login: string }).login;
    }

    console.log(
      `[Webhook] Installation ${action} for ID: ${installation.id} (${accountLogin})`,
    );

    try {
      if (action === 'created') {
        const account = installation.account as {
          login: string;
          id: number;
          type: 'User' | 'Organization';
        };
        if (!this.isValidAccount(account)) {
          console.log(
            '[Webhook] Invalid or missing account info in installation payload',
          );
          return;
        }

        const repositorySelection: 'selected' | 'all' =
          (installation.repository_selection as 'selected' | 'all') ??
          'selected';

        await this.projectService.handleGitHubAppInstalled(installation.id, {
          accountLogin: account.login,
          accountId: account.id,
          accountType: account.type,
          repositorySelection,
        });
      } else if (action === 'deleted' || action === 'suspend') {
        await this.projectService.handleGitHubAppUninstalled(installation.id);
      } else {
        console.log(`[Webhook] Unhandled installation action: ${action}`);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(
          '[Webhook] Error handling installation event:',
          error.message,
        );
      } else {
        console.error('[Webhook] Error handling installation event:', error);
      }
    }
  }

  private async handlePushEvent(payload: GithubWebhookRequestDto) {
    const fullName = payload.repository?.full_name;
    const installationId = String(payload.installation?.id ?? '');
    const pushedBranch = payload.ref?.replace('refs/heads/', '');
    if (!fullName || !installationId || !pushedBranch) return;

    try {
      const projects = await this.projectService.findProjectsByRepository(
        fullName,
        installationId,
      );
      const matchingProjects = projects.filter(
        (pr) => pr.selectedBranch === pushedBranch,
      );
      if (!matchingProjects.length) return;

      console.log(
        `[Webhook] Triggering ${matchingProjects.length} projects on branch ${pushedBranch}`,
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
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('[Webhook] Error handling push event:', errorMessage);
    }
  }

  private async handlePullRequestEvent(payload: GithubWebhookRequestDto) {
    const fullName = payload.repository?.full_name;
    const installationId = String(payload.installation?.id ?? '');
    if (!fullName || !installationId) return;

    try {
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
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(
        '[Webhook] Error handling pull request event:',
        errorMessage,
      );
    }
  }

  private isValidAccount(account: unknown): account is {
    login: string;
    id: number;
    type: 'User' | 'Organization';
  } {
    if (typeof account !== 'object' || account === null) return false;

    const obj = account as Record<string, unknown>;
    return (
      typeof obj.login === 'string' &&
      typeof obj.id === 'number' &&
      (obj.type === 'User' || obj.type === 'Organization')
    );
  }

  private verifyGithubSignature(rawBody: string, signature: string): boolean {
    const secret = process.env.GITHUB_WEBHOOK_SECRET || '';
    if (!secret || !signature || !rawBody) return false;

    try {
      const expectedDigest = `sha256=${createHmac('sha256', secret)
        .update(rawBody, 'utf8')
        .digest('hex')}`;
      return timingSafeEqual(
        Buffer.from(expectedDigest, 'utf8'),
        Buffer.from(signature, 'utf8'),
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('[Webhook] Signature verification error:', errorMessage);
      return false;
    }
  }
}

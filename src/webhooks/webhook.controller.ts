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

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly projectService: ProjectService) {}

  /**
   * @tag webhooks
   * @summary GitHub 웹훅 엔드포인트 확인
   */
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.BAD_REQUEST,
    description: '잘못된 요청',
  })
  @HttpCode(200)
  @TypedRoute.Get('/github')
  webhookGetGithubWebhook(): WebhookResponseDto {
    return { ok: true, message: 'GitHub webhook endpoint is ready' };
  }

  /**
   * @tag webhooks
   * @summary GitHub 웹훅 이벤트 처리
   */
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.BAD_REQUEST,
    description: '잘못된 요청 또는 서명 검증 실패',
  })
  @HttpCode(200)
  @TypedRoute.Post('/github')
  async webhookHandleGithubWebhook(
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

    console.log('[GitHub Webhook] Request received:', {
      event,
      delivery,
      payloadSize: JSON.stringify(payload).length,
      hasRawBody: !!request.rawBody,
    });

    try {
      // 개발 환경에서는 서명 검증 건너뛰기
      if (process.env.NODE_ENV !== 'production') {
        console.log(
          '[GitHub Webhook] Development mode: skipping signature verification',
        );
      } else {
        const signature = headers['x-hub-signature-256'];
        const rawBody = request.rawBody ?? JSON.stringify(payload);
        if (!this.verifyGithubSignature(rawBody, signature)) {
          console.log('[GitHub Webhook] Signature verification failed');
          return { ok: false, message: 'Invalid signature' };
        }
        console.log('[GitHub Webhook] Signature verification successful');
      }

      console.log(
        `[GitHub Webhook] Processing ${event} event (delivery: ${delivery})`,
      );

      // 이벤트 타입별 처리
      switch (event) {
        case 'installation':
          await this.webhookHandleInstallationEvent(payload);
          break;
        case 'installation_repositories':
          await this.webhookHandleInstallationRepositoriesEvent(payload);
          break;
        case 'push':
          await this.webhookHandlePushEvent(payload);
          break;
        case 'pull_request':
          await this.webhookHandlePullRequestEvent(payload);
          break;
        default:
          console.log(`[GitHub Webhook] Unhandled event type: ${event}`);
          break;
      }

      console.log(`[GitHub Webhook] Successfully processed ${event} event`);
      return { ok: true };
    } catch (error: unknown) {
      const errorInfo = this.getErrorInfo(error);
      console.error('[GitHub Webhook] Error processing webhook:', {
        event,
        delivery,
        error: errorInfo,
      });
      throw error;
    }
  }

  private async webhookHandleInstallationRepositoriesEvent(
    payload: GithubWebhookRequestDto,
  ): Promise<void> {
    const action = payload.action;
    const installation = payload.installation;

    console.log('[GitHub Webhook] Installation repositories event received:', {
      action,
      installationId: installation?.id,
      accountLogin: installation?.account
        ? this.getAccountLogin(installation.account)
        : 'unknown',
    });

    if (!installation || !installation.account) {
      console.log(
        '[GitHub Webhook] Missing installation or account data in payload',
      );
      return;
    }

    try {
      if (action === 'added' || action === 'removed') {
        const account = installation.account as {
          login: string;
          id: number;
          type: 'User' | 'Organization';
        };

        if (!this.isValidAccount(account)) {
          console.log('[GitHub Webhook] Invalid account info in payload:', {
            hasLogin: this.hasProperty(account, 'login'),
            hasId: this.hasProperty(account, 'id'),
            hasType: this.hasProperty(account, 'type'),
          });
          return;
        }

        const repositorySelection: 'selected' | 'all' =
          (installation.repository_selection as 'selected' | 'all') ??
          'selected';

        console.log('[GitHub Webhook] Updating installation:', {
          installationId: installation.id,
          accountLogin: account.login,
          accountType: account.type,
          repositorySelection,
          action,
        });

        await this.projectService.handleGitHubAppInstalled(installation.id, {
          account: account.login,
          targetId: account.id,
          accountType: account.type,
          repositorySelection,
        });

        console.log(
          `[GitHub Webhook] Installation repositories ${action} processed successfully`,
        );
      } else {
        console.log(
          `[GitHub Webhook] Unhandled installation repositories action: ${action}`,
        );
      }
    } catch (error: unknown) {
      const errorInfo = this.getErrorInfo(error);
      console.error(
        '[GitHub Webhook] Error handling installation repositories event:',
        {
          action,
          installationId: installation.id,
          error: errorInfo,
        },
      );
      throw error;
    }
  }

  private async webhookHandleInstallationEvent(
    payload: GithubWebhookRequestDto,
  ): Promise<void> {
    const action = payload.action;
    const installation = payload.installation;

    console.log('[GitHub Webhook] Installation event received:', {
      action,
      installationId: installation?.id,
      accountLogin: installation?.account
        ? this.getAccountLogin(installation.account)
        : 'unknown',
    });

    if (!installation || !installation.account) {
      console.log(
        '[GitHub Webhook] Missing installation or account data in payload',
      );
      return;
    }

    try {
      switch (action) {
        case 'created': {
          const account = installation.account as {
            login: string;
            id: number;
            type: 'User' | 'Organization';
          };

          if (!this.isValidAccount(account)) {
            console.log(
              '[GitHub Webhook] Invalid account info in installation payload:',
              {
                hasLogin: this.hasProperty(account, 'login'),
                hasId: this.hasProperty(account, 'id'),
                hasType: this.hasProperty(account, 'type'),
              },
            );
            return;
          }

          const repositorySelection: 'selected' | 'all' =
            (installation.repository_selection as 'selected' | 'all') ??
            'selected';

          console.log('[GitHub Webhook] Creating installation:', {
            installationId: installation.id,
            accountLogin: account.login,
            accountType: account.type,
            repositorySelection,
          });

          await this.projectService.handleGitHubAppInstalled(installation.id, {
            account: account.login,
            targetId: account.id,
            accountType: account.type,
            repositorySelection,
          });
          break;
        }
        case 'deleted':
        case 'suspend': {
          console.log('[GitHub Webhook] Removing installation:', {
            installationId: installation.id,
            action,
          });
          await this.projectService.handleGitHubAppUninstalled(installation.id);
          break;
        }
        default:
          console.log(
            `[GitHub Webhook] Unhandled installation action: ${action}`,
          );
          break;
      }

      console.log(
        `[GitHub Webhook] Installation ${action} processed successfully`,
      );
    } catch (error: unknown) {
      const errorInfo = this.getErrorInfo(error);
      console.error('[GitHub Webhook] Error handling installation event:', {
        action,
        installationId: installation.id,
        error: errorInfo,
      });
      throw error;
    }
  }

  private async webhookHandlePushEvent(
    payload: GithubWebhookRequestDto,
  ): Promise<void> {
    const fullName = payload.repository?.full_name;
    const installationId = String(payload.installation?.id ?? '');
    const pushedBranch = payload.ref?.replace('refs/heads/', '');

    console.log('[GitHub Webhook] Push event received:', {
      repository: fullName,
      installationId,
      branch: pushedBranch,
      ref: payload.ref,
      after: payload.after,
    });

    if (!fullName || !installationId || !pushedBranch) {
      console.log('[GitHub Webhook] Missing required data for push event:', {
        hasFullName: !!fullName,
        hasInstallationId: !!installationId,
        hasPushedBranch: !!pushedBranch,
      });
      return;
    }

    try {
      const projects = await this.projectService.findProjectsByRepository(
        fullName,
        installationId,
      );
      const matchingProjects = projects.filter(
        (pr) => pr.defaultBranch === pushedBranch,
      );

      if (!matchingProjects.length) {
        console.log('[GitHub Webhook] No matching projects found for push:', {
          repository: fullName,
          branch: pushedBranch,
          totalProjects: projects.length,
        });
        return;
      }

      console.log('[GitHub Webhook] Triggering builds:', {
        repository: fullName,
        branch: pushedBranch,
        matchingProjects: matchingProjects.length,
        projectIds: matchingProjects.map((pr) => pr.id),
      });

      await Promise.all(
        matchingProjects.map((pr) =>
          this.projectService.createBuildRecord(pr.id, {
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

      console.log(
        `[GitHub Webhook] Push event processed successfully for ${matchingProjects.length} projects`,
      );
    } catch (error: unknown) {
      const errorInfo = this.getErrorInfo(error);
      console.error('[GitHub Webhook] Error handling push event:', {
        repository: fullName,
        branch: pushedBranch,
        installationId,
        error: errorInfo,
      });
      throw error;
    }
  }

  private async webhookHandlePullRequestEvent(
    payload: GithubWebhookRequestDto,
  ): Promise<void> {
    const fullName = payload.repository?.full_name;
    const installationId = String(payload.installation?.id ?? '');
    const action = payload.action;
    const prNumber = payload.pull_request?.number;
    const sourceBranch = payload.pull_request?.head?.ref;
    const targetBranch = payload.pull_request?.base?.ref;

    console.log('[GitHub Webhook] Pull request event received:', {
      repository: fullName,
      installationId,
      action,
      prNumber,
      sourceBranch,
      targetBranch,
    });

    if (!fullName || !installationId) {
      console.log(
        '[GitHub Webhook] Missing required data for pull request event:',
        {
          hasFullName: !!fullName,
          hasInstallationId: !!installationId,
        },
      );
      return;
    }

    try {
      const projects = await this.projectService.findProjectsByRepository(
        fullName,
        installationId,
      );

      if (!projects.length) {
        console.log('[GitHub Webhook] No projects found for pull request:', {
          repository: fullName,
          installationId,
        });
        return;
      }

      console.log('[GitHub Webhook] Triggering builds for pull request:', {
        repository: fullName,
        action,
        prNumber,
        projectCount: projects.length,
        projectIds: projects.map((pr) => pr.id),
      });

      await Promise.all(
        projects.map((pr) =>
          this.projectService.createBuildRecord(pr.id, {
            trigger: 'webhook:pull_request',
            metadata: {
              action,
              prNumber,
              sourceBranch,
              targetBranch,
            },
          }),
        ),
      );

      console.log(
        `[GitHub Webhook] Pull request event processed successfully for ${projects.length} projects`,
      );
    } catch (error: unknown) {
      const errorInfo = this.getErrorInfo(error);
      console.error('[GitHub Webhook] Error handling pull request event:', {
        repository: fullName,
        installationId,
        action,
        prNumber,
        error: errorInfo,
      });
      throw error;
    }
  }

  private isValidAccount(account: unknown): account is {
    login: string;
    id: number;
    type: 'User' | 'Organization';
  } {
    if (typeof account !== 'object' || account === null) {
      return false;
    }

    const obj = account as Record<string, unknown>;
    const isValid =
      typeof obj.login === 'string' &&
      typeof obj.id === 'number' &&
      (obj.type === 'User' || obj.type === 'Organization');

    if (!isValid) {
      console.log('[GitHub Webhook] Invalid account structure:', {
        hasLogin: typeof obj.login === 'string',
        hasId: typeof obj.id === 'number',
        hasValidType: obj.type === 'User' || obj.type === 'Organization',
        actualType: obj.type,
      });
    }

    return isValid;
  }

  private getAccountLogin(account: unknown): string {
    if (typeof account === 'object' && account !== null && 'login' in account) {
      const login = (account as { login: unknown }).login;
      return typeof login === 'string' ? login : 'unknown';
    }
    return 'unknown';
  }

  private getErrorInfo(error: unknown): {
    message: string;
    name: string;
    stack?: string;
  } {
    if (error instanceof Error) {
      return {
        message: error.message,
        name: error.name,
        stack: error.stack?.substring(0, 500),
      };
    }
    return {
      message: 'Unknown error',
      name: 'UnknownError',
    };
  }

  private hasProperty<T extends string>(
    obj: unknown,
    prop: T,
  ): obj is Record<T, unknown> {
    return typeof obj === 'object' && obj !== null && prop in obj;
  }

  private verifyGithubSignature(rawBody: string, signature: string): boolean {
    const secret = process.env.GITHUB_WEBHOOK_SECRET || '';

    console.log('[GitHub Webhook] Signature verification attempt:', {
      hasSecret: !!secret,
      hasSignature: !!signature,
      hasRawBody: !!rawBody,
      bodyLength: rawBody?.length || 0,
      signatureStart: signature?.substring(0, 10) || 'none',
    });

    if (!secret || !signature || !rawBody) {
      console.log(
        '[GitHub Webhook] Missing required data for signature verification',
      );
      return false;
    }

    try {
      const expectedDigest = `sha256=${createHmac('sha256', secret)
        .update(rawBody, 'utf8')
        .digest('hex')}`;

      const isValid = timingSafeEqual(
        Buffer.from(expectedDigest, 'utf8'),
        Buffer.from(signature, 'utf8'),
      );

      console.log('[GitHub Webhook] Signature verification result:', {
        isValid,
        expectedStart: expectedDigest.substring(0, 15),
        receivedStart: signature.substring(0, 15),
      });

      return isValid;
    } catch (error: unknown) {
      const errorInfo = this.getErrorInfo(error);
      console.error('[GitHub Webhook] Signature verification error:', {
        error: errorInfo,
        hasSecret: !!secret,
        bodyLength: rawBody.length,
      });
      return false;
    }
  }
}

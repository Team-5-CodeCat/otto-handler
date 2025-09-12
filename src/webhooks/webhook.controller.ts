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
   * 객체가 특정 속성을 가지고 있는지 확인하는 타입 가드
   */
  private hasProperty<T extends string>(
    obj: unknown,
    prop: T,
  ): obj is Record<T, unknown> {
    return typeof obj === 'object' && obj !== null && prop in obj;
  }

  /**
   * GitHub webhook payload의 head_commit 객체 타입 가드
   */
  private isHeadCommit(obj: unknown): obj is { message?: string } {
    if (typeof obj !== 'object' || obj === null) {
      return false;
    }
    const headCommit = obj as Record<string, unknown>;
    return (
      typeof headCommit.message === 'string' || headCommit.message === undefined
    );
  }

  /**
   * GitHub webhook payload의 pusher 객체 타입 가드
   */
  private isPusher(obj: unknown): obj is { name?: string } {
    if (typeof obj !== 'object' || obj === null) {
      return false;
    }
    const pusher = obj as Record<string, unknown>;
    return typeof pusher.name === 'string' || pusher.name === undefined;
  }

  /**
   * 프로젝트 배열 타입 가드
   */
  private isProjectArray(obj: unknown): obj is Array<{
    projectId: string;
    selectedBranch: string;
  }> {
    if (!Array.isArray(obj)) {
      return false;
    }

    return obj.every((item) => {
      if (typeof item !== 'object' || item === null) {
        return false;
      }

      const projectItem = item as Record<string, unknown>;
      return (
        typeof projectItem.projectId === 'string' &&
        typeof projectItem.selectedBranch === 'string'
      );
    });
  }

  /**
   * 서비스 메서드 호출을 안전하게 처리하는 래퍼
   */
  private async safeServiceCall<T>(
    serviceCall: () => Promise<T>,
    errorContext: string,
  ): Promise<T | undefined> {
    try {
      const result = await serviceCall();
      return result;
    } catch (error: unknown) {
      const errorInfo = this.getErrorInfo(error);
      console.error(`${errorContext}:`, errorInfo);
      return undefined;
    }
  }

  /**
   * Push 이벤트 기록을 안전하게 처리하는 래퍼
   */
  private async safeRecordPushEvent(
    projectId: string,
    pushData: {
      branch: string;
      commitSha: string;
      commitMessage?: string;
      pusherName?: string;
      pushedAt: Date;
    },
  ): Promise<
    | {
        projectId: string;
        createdAt: Date;
        pushEventId: string;
        branch: string;
        commitSha: string;
        commitMessage: string | null;
        pusherName: string | null;
        pushedAt: Date;
      }
    | undefined
  > {
    try {
      const result = await (
        this.projectService.recordPushEvent as (
          projectId: string,
          pushData: {
            branch: string;
            commitSha: string;
            commitMessage?: string;
            pusherName?: string;
            pushedAt: Date;
          },
        ) => Promise<{
          projectId: string;
          createdAt: Date;
          pushEventId: string;
          branch: string;
          commitSha: string;
          commitMessage: string | null;
          pusherName: string | null;
          pushedAt: Date;
        }>
      )(projectId, pushData);
      return result as {
        projectId: string;
        createdAt: Date;
        pushEventId: string;
        branch: string;
        commitSha: string;
        commitMessage: string | null;
        pusherName: string | null;
        pushedAt: Date;
      };
    } catch (error: unknown) {
      const errorInfo = this.getErrorInfo(error);
      console.error('Error recording push event:', errorInfo);
      return undefined;
    }
  }

  /**
   * 프로젝트 배열 타입 정의
   */
  private typeProjectArray = Array<{
    projectId: string;
    selectedBranch: string;
  }>;

  /**
   * 에러 정보를 안전하게 추출하는 헬퍼 메서드
   */
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
    const eventType = headers['x-github-event'];
    const deliveryId = headers['x-github-delivery'];
    const signature = headers['x-hub-signature-256'];

    console.log('[GitHub Webhook] Received event:', {
      eventType,
      deliveryId,
      hasSignature: !!signature,
      hasRawBody: !!request.rawBody,
    });

    // 서명 검증
    if (
      request.rawBody &&
      !this.verifyGithubSignature(request.rawBody, signature)
    ) {
      console.log('[GitHub Webhook] Signature verification failed');
      throw new Error('Invalid signature');
    }

    // 이벤트 타입별 처리
    switch (eventType) {
      case 'push':
        await this.webhookHandlePushEvent(payload);
        break;
      case 'installation':
        this.webhookHandleInstallationEvent(payload);
        break;
      case 'pull_request':
        this.webhookHandlePullRequestEvent(payload);
        break;
      default:
        console.log('[GitHub Webhook] Unhandled event type:', eventType);
    }

    return { ok: true, message: 'Webhook processed successfully' };
  }

  /**
   * Push 이벤트 처리
   */
  private async webhookHandlePushEvent(
    payload: GithubWebhookRequestDto,
  ): Promise<void> {
    console.log('[GitHub Webhook] Processing push event:', {
      ref: payload.ref,
      after: payload.after,
      repository: payload.repository?.full_name,
    });

    // payload를 안전하게 처리
    const payloadObj = payload as Record<string, unknown>;

    // head_commit 정보 추출
    const headCommit = this.hasProperty(payloadObj, 'head_commit')
      ? payloadObj.head_commit
      : undefined;

    const headCommitData = this.isHeadCommit(headCommit)
      ? headCommit
      : undefined;

    // pusher 정보 추출
    const pusher = this.hasProperty(payloadObj, 'pusher')
      ? payloadObj.pusher
      : undefined;

    const pusherData = this.isPusher(pusher) ? pusher : undefined;

    // repository 정보 추출
    const repository = this.hasProperty(payloadObj, 'repository')
      ? payloadObj.repository
      : undefined;

    if (!repository || typeof repository !== 'object' || repository === null) {
      console.log('[GitHub Webhook] Invalid repository data');
      return;
    }

    const repoData = repository as Record<string, unknown>;
    const fullName =
      typeof repoData.full_name === 'string' ? repoData.full_name : undefined;
    const installation = this.hasProperty(repoData, 'installation')
      ? repoData.installation
      : undefined;

    const githubInstallationId =
      installation &&
      typeof installation === 'object' &&
      installation !== null &&
      this.hasProperty(installation, 'id') &&
      typeof installation.id === 'string'
        ? installation.id
        : undefined;

    if (!fullName || !githubInstallationId) {
      console.log('[GitHub Webhook] Missing required repository data');
      return;
    }

    // 브랜치 정보 추출
    const ref = typeof payloadObj.ref === 'string' ? payloadObj.ref : '';
    const pushedBranch = ref.replace('refs/heads/', '');
    const nameParts = fullName.split('/');
    const githubOwner = nameParts[0] || '';
    const githubRepoName = nameParts[1] || '';

    if (!githubOwner || !githubRepoName) {
      console.log('[GitHub Webhook] Invalid repository name format');
      return;
    }

    console.log('[GitHub Webhook] Push event details:', {
      repository: fullName,
      githubInstallationId,
      branch: pushedBranch,
      ref: payloadObj.ref,
      after: payloadObj.after,
      commitMessage: headCommitData?.message,
      pusher: pusherData?.name,
    });

    try {
      const projectsResult = await this.safeServiceCall<
        Array<{
          projectId: string;
          selectedBranch: string;
        }>
      >(
        () =>
          this.projectService.findProjectsByRepository(
            githubOwner,
            githubRepoName,
            githubInstallationId,
          ),
        'Error finding projects by repository',
      );

      if (!projectsResult) {
        console.log('[GitHub Webhook] Failed to fetch projects:', {
          repository: fullName,
          branch: pushedBranch,
          githubInstallationId,
        });
        return;
      }

      if (!this.isProjectArray(projectsResult)) {
        console.log('[GitHub Webhook] Invalid projects data received:', {
          repository: fullName,
          branch: pushedBranch,
          githubInstallationId,
        });
        return;
      }

      const projects = projectsResult;

      if (!projects || !projects.length) {
        console.log('[GitHub Webhook] No projects found for push:', {
          repository: fullName,
          branch: pushedBranch,
          githubInstallationId,
        });
        return;
      }

      console.log('[GitHub Webhook] Found projects for push event:', {
        repository: fullName,
        branch: pushedBranch,
        projectCount: projects.length,
        projects: projects.map((p) => ({
          projectId: p.projectId,
          selectedBranch: p.selectedBranch,
        })),
      });

      // 모든 연결된 프로젝트에 대해 처리
      await Promise.all(
        projects.map(async (project) => {
          // 1. Push 이벤트 기록 (히스토리 목적)
          const recordResult = await this.safeRecordPushEvent(
            project.projectId,
            {
              branch: pushedBranch,
              commitSha:
                typeof payloadObj.after === 'string' ? payloadObj.after : '',
              commitMessage: headCommitData?.message,
              pusherName: pusherData?.name,
              pushedAt: new Date(),
            },
          );

          if (!recordResult) {
            console.warn('Failed to record push event');
          }

          // 2. 해당 브랜치가 프로젝트의 선택된 브랜치인 경우에만 Push 이벤트 기록
          if (project.selectedBranch === pushedBranch) {
            console.log(
              '[GitHub Webhook] Recording push event for matching branch:',
              {
                projectId: project.projectId,
                selectedBranch: project.selectedBranch,
                pushedBranch,
              },
            );

            const pushRecord = await this.safeServiceCall(
              () =>
                this.projectService.recordPushEvent(project.projectId, {
                  branch: pushedBranch,
                  commitSha:
                    typeof payloadObj.after === 'string'
                      ? payloadObj.after
                      : '',
                  commitMessage: headCommitData?.message,
                  pusherName: pusherData?.name,
                  pushedAt: new Date(),
                }),
              'Error recording push event',
            );

            if (!pushRecord) {
              console.warn('Failed to record push event');
            }
          } else {
            console.log(
              '[GitHub Webhook] Branch mismatch, skipping build trigger:',
              {
                projectId: project.projectId,
                selectedBranch: project.selectedBranch,
                pushedBranch,
              },
            );
          }
        }),
      );
    } catch (error: unknown) {
      const errorInfo = this.getErrorInfo(error);
      console.error('[GitHub Webhook] Error processing push event:', {
        repository: fullName,
        branch: pushedBranch,
        error: errorInfo,
      });
    }
  }

  /**
   * Installation 이벤트 처리
   */
  private webhookHandleInstallationEvent(
    payload: GithubWebhookRequestDto,
  ): void {
    console.log('[GitHub Webhook] Processing installation event:', {
      action: payload.action,
      installation: payload.installation?.id,
    });

    // Installation 이벤트는 현재 별도 처리 없음
    // 필요시 사용자 연결 로직 추가
  }

  /**
   * Pull Request 이벤트 처리
   */
  private webhookHandlePullRequestEvent(
    payload: GithubWebhookRequestDto,
  ): void {
    console.log('[GitHub Webhook] Processing pull request event:', {
      action: payload.action,
      pullRequest: payload.pull_request?.number,
    });

    // Pull Request 이벤트는 현재 별도 처리 없음
    // 필요시 PR 기반 빌드 트리거 로직 추가
  }

  /**
   * GitHub 웹훅 서명 검증
   */
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

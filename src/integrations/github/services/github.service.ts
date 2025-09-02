import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { RegisterGithubAppDto } from '../dtos/request/register-github-app.dto';
import { Octokit } from '@octokit/rest';

/**
 * 깃허브 앱 관련 서비스
 * - 깃허브 앱 설치 정보 저장
 * - 깃허브 API 연동
 * - Webhook 이벤트 처리
 */
@Injectable()
export class GithubService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 깃허브 앱 등록 처리
   * @param user 로그인된 사용자 정보 (userID 등)
   * @param dto 깃허브 앱 설치 정보
   */
  async registerApp(user: { userID: string }, dto: RegisterGithubAppDto) {
    // 1. 깃허브 앱 설치 정보 DB 저장 (upsert)
    await this.prisma.github.upsert({
      where: { userID: user.userID },
      update: {
        githubID: String(dto.installationId),
        accessToken: dto.accessToken ?? null,
      },
      create: {
        userID: user.userID,
        githubID: String(dto.installationId),
        accessToken: dto.accessToken ?? null,
      },
    });
    // 2. 필요시 Octokit 등으로 깃허브 API 호출 (예: 설치 정보 확인)
    // const octokit = new Octokit({ auth: dto.accessToken });
    // ...
    return { success: true, message: '깃허브 앱이 등록되었습니다.' };
  }

  /**
   * Webhook 이벤트 처리 예시 (실제 구현은 컨트롤러에서 endpoint로 분리)
   */
  async handleWebhookEvent(event: any) {
    // event.action, event.repository, event.sender 등 활용
    // 필요한 비즈니스 로직 구현
    return { received: true };
  }
}

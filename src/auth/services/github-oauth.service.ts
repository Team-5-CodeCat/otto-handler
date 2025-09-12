import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { GithubAuthRequestDto } from '../dtos';
import type { GithubToken, GitHubTokenType, GithubUserType } from './type';
import { ConfigService } from '@nestjs/config';
import { JwtService } from './jwt.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class GithubOauthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
  ) {}

  async getGithubToken({
    code,
    state,
  }: GithubAuthRequestDto): Promise<GithubToken | null> {
    const clientId = this.configService.get<string>('OTTO_GITHUB_OAUTH_ID');
    const clientSecret = this.configService.get<string>(
      'OTTO_GITHUB_OAUTH_SECRET',
    );

    if (!clientId || !clientSecret) {
      throw new HttpException(
        'GitHub OAuth 설정이 누락되었습니다. OTTO_GITHUB_OAUTH_ID OTTO_GITHUB_OAUTH_ID 환경변수를 확인하세요.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    try {
      const tokenRes = await fetch(
        'https://github.com/login/oauth/access_token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            state,
          }),
        },
      );

      if (!tokenRes.ok) {
        throw new Error(`HTTP error! status: ${tokenRes.status}`);
      }

      const tokenResponse = (await tokenRes.json()) as GitHubTokenType;
      return {
        access_token: tokenResponse.access_token ?? '',
        access_token_expired_at: 0,
        refresh_token: '',
        refresh_token_expired_at: 0,
      };
    } catch {
      return null;
    }
  }
  async getUserInfo(
    dto: GithubAuthRequestDto,
  ): Promise<GithubUserType & { access_token: string }> {
    const tokenData = await this.getGithubToken(dto);
    if (!tokenData?.access_token) {
      throw new HttpException('GitHub 토큰 획득 실패', HttpStatus.UNAUTHORIZED);
    }

    try {
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!userRes.ok) {
        throw new Error(`HTTP error! status: ${userRes.status}`);
      }

      const userData = (await userRes.json()) as GithubUserType;
      return {
        ...userData,
        access_token: tokenData.access_token,
      };
    } catch (err) {
      console.error('[GitHub OAuth] User info fetch error:', err);
      throw new HttpException(`로그인 실패`, HttpStatus.UNAUTHORIZED);
    }
  }
}

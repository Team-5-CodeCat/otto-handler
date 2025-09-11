import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { GithubAuthRequestDto } from '../dtos';
import type { GitHubTokenType, GithubUserType } from './type';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GithubOauthService {
  constructor(private readonly configService: ConfigService) {}

  async getUserInfo({
    code,
    state,
  }: GithubAuthRequestDto): Promise<GithubUserType> {
    const clientId = this.configService.get<string>('GITHUB_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GITHUB_SECRET');

    if (!clientId || !clientSecret) {
      throw new HttpException(
        'GitHub OAuth 설정이 누락되었습니다. GITHUB_CLIENT_ID와 GITHUB_SECRET 환경변수를 확인하세요.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    let tokenResponse: GitHubTokenType;

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

      tokenResponse = (await tokenRes.json()) as GitHubTokenType;

      if (!tokenResponse.access_token) {
        console.error('[GitHub OAuth] Token response error:', {
          error: tokenResponse.error,
          error_description: tokenResponse.error_description,
          full_response: tokenResponse,
        });
        const errorMessage =
          tokenResponse.error_description ||
          tokenResponse.error ||
          '로그인 실패';
        throw new HttpException(`로그인 실패`, HttpStatus.UNAUTHORIZED);
      }
    } catch (err) {
      console.error('[GitHub OAuth] Token fetch error:', err);
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        `GitHub 토큰 획득 실패}`,
        HttpStatus.UNAUTHORIZED,
      );
    }

    const accessToken = tokenResponse.access_token;
    let githubUser: GithubUserType;

    try {
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!userRes.ok) {
        throw new Error(`HTTP error! status: ${userRes.status}`);
      }

      githubUser = (await userRes.json()) as GithubUserType;
      return githubUser;
    } catch (err) {
      console.error('[GitHub OAuth] User info fetch error:', err);
      throw new HttpException(`로그인 실패`, HttpStatus.UNAUTHORIZED);
    }
  }
}

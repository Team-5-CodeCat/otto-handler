import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginRequestDto, LoginResponseDto, SignUpRequestDto } from '../dtos';
import { AuthErrorEnum, AuthResponseEnum, TOKEN_CONSTANTS } from '../constants';
import { JwtService } from './jwt.service';
import { randomBytes } from 'crypto';
import type { JwtPayloadType } from '../../common/type';
import { SignUpResponseDto } from '../dtos/response/sign-up-response';
import { GithubOauthService } from './github-oauth.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly githubOauthService: GithubOauthService,
  ) {}

  /**
   * 로그인
   * @param email
   * @param password
   */
  async login({ email, password }: LoginRequestDto): Promise<LoginResponseDto> {
    const user = await this.prismaService.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new UnauthorizedException(AuthErrorEnum.LOGIN_FAIL);
    }

    // GitHub OAuth only - password authentication is no longer supported
    throw new UnauthorizedException(
      'Password authentication is disabled. Please use GitHub OAuth.',
    );
  }

  /**
   * 리프레시 토큰으로 로그인 (토큰 회전)
   * - 전달받은 refresh 토큰을 해시하여 DB에서 조회
   * - 만료/미존재 시 Unauthorized
   * - 기존 refresh 토큰 레코드는 삭제하고, 새 토큰을 발급/저장
   * - 새 access, refresh 토큰과 TTL 반환
   */
  async loginByRefresh(refreshToken: string): Promise<LoginResponseDto> {
    const nowSec: number = Math.floor(Date.now() / 1000);
    const accessTokenExpiresIn: number = TOKEN_CONSTANTS.ACCESS_TOKEN_TTL_SEC;
    const refreshTokenExpiresIn: number = TOKEN_CONSTANTS.REFRESH_TOKEN_TTL_SEC;

    const existing = await this.prismaService.session.findUnique({
      where: { sessionToken: refreshToken },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        user: { select: { email: true } },
      },
    });

    if (!existing) {
      throw new UnauthorizedException(AuthErrorEnum.REFRESH_FAIL);
    }

    if (existing.expiresAt.getTime() <= Date.now()) {
      // 만료된 토큰은 정리
      await this.prismaService.session.delete({
        where: { id: existing.id },
      });
      throw new UnauthorizedException(AuthErrorEnum.REFRESH_FAIL);
    }

    await this.prismaService.session.delete({
      where: { id: existing.id },
    });

    const newAccessToken: string = this.jwtService.encode(
      { sub: existing.userId, email: existing.user?.email, type: 'access' },
      { expiresIn: accessTokenExpiresIn },
    );
    const newRefreshToken: string = randomBytes(64).toString('hex');
    const newRefreshExpiresAt: Date = new Date(
      (nowSec + refreshTokenExpiresIn) * 1000,
    );

    await this.prismaService.session.create({
      data: {
        userId: existing.userId,
        sessionToken: newRefreshToken,
        expiresAt: newRefreshExpiresAt,
      },
    });

    return {
      message: AuthResponseEnum.LOGIN_SUCCESS,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      accessTokenExpiresIn,
      refreshTokenExpiresIn,
    };
  }

  /**
   * 회원가입
   */
  async signUp({
    email,
    password,
    username,
  }: SignUpRequestDto): Promise<SignUpResponseDto> {
    const exists = await this.prismaService.user.findUnique({
      where: { email },
    });
    if (exists) {
      throw new ConflictException(AuthErrorEnum.EMAIL_ALREADY_EXISTS);
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    await this.prismaService.user.create({
      data: {
        email,
        githubId: '', // This will need to be set via GitHub OAuth
        githubUsername: username || email.split('@')[0], // Temporary username
        name: username,
      },
    });
    return { message: AuthResponseEnum.SIGN_UP_SUCCESS };
  }
}

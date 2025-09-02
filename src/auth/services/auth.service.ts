import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginRequestDto, LoginResponseDto } from '../dtos';
import { AuthErrorEnum, AuthResponseEnum, TOKEN_CONSTANTS } from '../constants';
import { JwtService } from './jwt.service';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 로그인
   * @param email
   * @param password
   */
  async login({ email, password }: LoginRequestDto): Promise<LoginResponseDto> {
    const user = await this.prismaService.user.findUnique({
      where: { email },
      select: { userID: true, email: true, password: true },
    });

    if (!user) {
      throw new UnauthorizedException(AuthErrorEnum.LOGIN_FAIL);
    }
    if (user.password === null) {
      throw new UnauthorizedException(AuthErrorEnum.GITHUB_USER);
    }
    const passwordValid = await bcrypt.compare(password, user.password);

    if (!passwordValid) {
      throw new UnauthorizedException(AuthErrorEnum.LOGIN_FAIL);
    }

    const now: number = Math.floor(Date.now() / 1000);
    const accessTokenExpiresIn: number = TOKEN_CONSTANTS.ACCESS_TOKEN_TTL_SEC;
    const refreshTokenExpiresIn: number = TOKEN_CONSTANTS.REFRESH_TOKEN_TTL_SEC;

    const accessToken: string = this.jwtService.encode(
      { sub: user.userID, email: user.email, type: 'access' },
      { expiresIn: accessTokenExpiresIn },
    );
    const refreshToken: string = randomBytes(64).toString('hex');
    const refreshTokenHash: string = createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const refreshExpiresAt: Date = new Date(
      (now + refreshTokenExpiresIn) * 1000,
    );

    await this.prismaService.refreshToken.create({
      data: {
        userID: user.userID,
        token: refreshTokenHash,
        expiresAt: refreshExpiresAt,
      },
    });

    return {
      message: AuthResponseEnum.LOGIN_SUCCESS,
      accessToken,
      refreshToken,
      accessTokenExpiresIn,
      refreshTokenExpiresIn,
    };
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

    const incomingHash: string = createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const existing = await this.prismaService.refreshToken.findUnique({
      where: { token: incomingHash },
      select: {
        tokenId: true,
        userID: true,
        expiresAt: true,
        user: { select: { email: true } },
      },
    });

    if (!existing) {
      throw new UnauthorizedException(AuthErrorEnum.REFRESH_FAIL);
    }

    if (existing.expiresAt.getTime() <= Date.now()) {
      // 만료된 토큰은 정리
      await this.prismaService.refreshToken.delete({
        where: { tokenId: existing.tokenId },
      });
      throw new UnauthorizedException(AuthErrorEnum.REFRESH_FAIL);
    }

    // 회전: 기존 토큰 제거 후 새로운 토큰 발급/저장
    await this.prismaService.refreshToken.delete({
      where: { tokenId: existing.tokenId },
    });

    const newAccessToken: string = this.jwtService.encode(
      { sub: existing.userID, email: existing.user?.email, type: 'access' },
      { expiresIn: accessTokenExpiresIn },
    );
    const newRefreshTokenPlain: string = randomBytes(64).toString('hex');
    const newRefreshTokenHash: string = createHash('sha256')
      .update(newRefreshTokenPlain)
      .digest('hex');
    const newRefreshExpiresAt: Date = new Date(
      (nowSec + refreshTokenExpiresIn) * 1000,
    );

    await this.prismaService.refreshToken.create({
      data: {
        userID: existing.userID,
        token: newRefreshTokenHash,
        expiresAt: newRefreshExpiresAt,
      },
    });

    return {
      message: AuthResponseEnum.LOGIN_SUCCESS,
      accessToken: newAccessToken,
      refreshToken: newRefreshTokenPlain,
      accessTokenExpiresIn,
      refreshTokenExpiresIn,
    };
  }
}

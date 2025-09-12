import { FastifyRequest } from 'fastify';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '../../auth/services';
import { PrismaService } from '../../database/prisma.service';
import { User } from '@prisma/client';
import { AuthErrorEnum, TOKEN_CONSTANTS } from '../../auth/constants';
import { IRequestType, JwtPayloadType } from '../type';

@Injectable()
export class AuthGuardRole implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<IRequestType>();

    const token = this.extractTokenFromRequest(request);
    if (!token) {
      throw new UnauthorizedException(AuthErrorEnum.NOT_VALID_USER);
    }

    try {
      const payload = this.jwtService.decode<JwtPayloadType>(token);

      // JWT 디코딩 실패 체크를 try-catch 안에서 처리
      if (!payload || !payload.sub) {
        throw new UnauthorizedException(AuthErrorEnum.NOT_VALID_USER);
      }

      const user = await this.prismaService.user.findUnique({
        where: { userId: payload.sub },
        select: {
          userId: true,
          username: true,
          githubId: true,
          githubNodeId: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException(AuthErrorEnum.NOT_VALID_USER);
      }

      // request.user에 사용자 정보 설정
      request.user = {
        user_id: user.userId,
        nickname:
          'username' in user
            ? (user as User & { username: string }).username
            : 'user',
      };

      // 역할 권한 체크는 현재 구현되지 않음

      return true;
    } catch (error) {
      // ForbiddenException은 그대로 전파
      if (error instanceof ForbiddenException) {
        throw error;
      }

      // JWT 만료, 형식 오류 등 모든 인증 관련 오류를 LOGIN_FAIL로 통일
      throw new UnauthorizedException(AuthErrorEnum.NOT_VALID_USER);
    }
  }

  private extractTokenFromRequest(request: FastifyRequest): string | null {
    // 1. 쿠키에서 토큰 추출
    const cookieToken = request.cookies?.[TOKEN_CONSTANTS.ACCESS_TOKEN_COOKIE];
    if (cookieToken) {
      return cookieToken;
    }

    // 2. Authorization 헤더에서 토큰 추출
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.replace('Bearer ', '');
    }

    return null;
  }
}

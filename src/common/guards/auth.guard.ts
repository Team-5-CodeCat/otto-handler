import { MemberRole } from '@prisma/client';
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
import { Reflector } from '@nestjs/core';
import { AuthErrorEnum, TOKEN_CONSTANTS } from '../../auth/constants';
import { IRequestType, JwtPayloadType } from '../type';
import { ROLES_KEY } from '../decorators/role-guard';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<IRequestType>();
    const requiredRoles = this.reflector.get<MemberRole[]>(
      ROLES_KEY, // 하드코딩된 'roles' 대신 상수 사용
      context.getHandler(),
    );

    const token = this.extractTokenFromRequest(request);
    if (!token) {
      throw new UnauthorizedException(AuthErrorEnum.LOGIN_FAIL);
    }

    try {
      const payload = this.jwtService.decode<JwtPayloadType>(token);

      // JWT 디코딩 실패 체크를 try-catch 안에서 처리
      if (!payload || !payload.sub) {
        throw new UnauthorizedException(AuthErrorEnum.LOGIN_FAIL);
      }

      const user = await this.prismaService.user.findUnique({
        where: { userID: payload.sub },
        select: {
          userID: true,
          email: true,
          name: true,
          memberRole: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException(AuthErrorEnum.LOGIN_FAIL);
      }

      // request.user에 사용자 정보 설정
      request.user = {
        user_id: user.userID,
        nickname: user.name,
        email: user.email,
        role: user.memberRole,
      };

      // 역할 권한 체크
      if (requiredRoles && requiredRoles.length > 0) {
        if (!requiredRoles.includes(user.memberRole)) {
          throw new ForbiddenException('접근 권한이 없습니다.');
        }
      }

      return true;
    } catch (error) {
      // ForbiddenException은 그대로 전파
      if (error instanceof ForbiddenException) {
        throw error;
      }

      // JWT 만료, 형식 오류 등 모든 인증 관련 오류를 LOGIN_FAIL로 통일
      throw new UnauthorizedException(AuthErrorEnum.LOGIN_FAIL);
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

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * 인증된 사용자만 접근 가능하게 하는 Guard
 * - FastifyRequest 기준으로 쿠키/헤더에서 사용자 정보 추출
 * - 실제 서비스에서는 JWT 검증 등 추가 필요
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // 예시: req.user가 있으면 인증된 것으로 간주
    if (request.user && request.user.userID) {
      return true;
    }
    throw new UnauthorizedException('로그인이 필요합니다.');
  }
}

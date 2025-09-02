import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@auth/services/jwt.service';

/**
 * JWT 인증 Guard
 * - accessToken을 쿠키에서 추출해 검증
 * - 검증 성공 시 request.user에 정보 주입
 */
@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const token = request.cookies?.access_token;
        if (!token) throw new UnauthorizedException('로그인이 필요합니다.');
        try {
            const payload = this.jwtService.decode(token);
            request.user = payload;
            return true;
        } catch {
            throw new UnauthorizedException('유효하지 않은 토큰');
        }
    }
}

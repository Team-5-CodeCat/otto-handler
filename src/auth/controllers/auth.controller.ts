import { AuthService } from '../services';
import { TypedBody, TypedException, TypedRoute } from '@nestia/core';
import type { LoginRequestDto, LoginResponseDto, SignUpRequestDto, SignUpResponseDto } from '../dtos';
import {
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Res,
  Req,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { TOKEN_CONSTANTS } from '../constants';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthErrorEnum } from '../constants';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * @tag auth
   * 회원가입
   */
  @TypedException<ConflictException>({
    status: HttpStatus.CONFLICT,
    description: '이메일 중복',
  })
  @HttpCode(200)
  @TypedRoute.Post('/sign_up')
  async authSignUp(
    @TypedBody() body: SignUpRequestDto,
  ): Promise<SignUpResponseDto> {
    return this.authService.signUp(body);
  }

  /**
   * @tag auth
   * 로그인
   */
  @TypedException<HttpException>({
    status: HttpStatus.UNAUTHORIZED,
    description: '로그인 실패',
  })
  @HttpCode(200)
  @TypedRoute.Post('/sign_in')
  async authSignIn(
    @TypedBody() body: LoginRequestDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<LoginResponseDto> {
    const result = await this.authService.login(body);

    res.setCookie(TOKEN_CONSTANTS.ACCESS_TOKEN_COOKIE, result.accessToken, {
      httpOnly: TOKEN_CONSTANTS.COOKIE_HTTP_ONLY,
      secure: TOKEN_CONSTANTS.COOKIE_SECURE,
      sameSite: TOKEN_CONSTANTS.COOKIE_SAME_SITE,
      path: '/',
      maxAge: TOKEN_CONSTANTS.ACCESS_TOKEN_TTL_SEC,
    });

    res.setCookie(TOKEN_CONSTANTS.REFRESH_TOKEN_COOKIE, result.refreshToken, {
      httpOnly: TOKEN_CONSTANTS.COOKIE_HTTP_ONLY,
      secure: TOKEN_CONSTANTS.COOKIE_SECURE,
      sameSite: TOKEN_CONSTANTS.COOKIE_SAME_SITE,
      path: '/',
      maxAge: TOKEN_CONSTANTS.REFRESH_TOKEN_TTL_SEC,
    });

    return result;
  }

  /**
   * @tag auth
   * 리프레시 토큰 로그인 (회전)
   */
  @TypedException<HttpException>({
    status: HttpStatus.UNAUTHORIZED,
    description: '리프레시 실패',
  })
  @HttpCode(200)
  @TypedRoute.Post('/sign_in/refresh')
  async authSignInByRefresh(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<LoginResponseDto> {
    const refreshToken = req.cookies[TOKEN_CONSTANTS.REFRESH_TOKEN_COOKIE];
    if (!refreshToken) {
      throw new UnauthorizedException(AuthErrorEnum.REFRESH_FAIL);
    }
    const result = await this.authService.loginByRefresh(refreshToken);
    res.setCookie(TOKEN_CONSTANTS.ACCESS_TOKEN_COOKIE, result.accessToken, {
      httpOnly: TOKEN_CONSTANTS.COOKIE_HTTP_ONLY,
      secure: TOKEN_CONSTANTS.COOKIE_SECURE,
      sameSite: TOKEN_CONSTANTS.COOKIE_SAME_SITE,
      path: '/',
      maxAge: TOKEN_CONSTANTS.ACCESS_TOKEN_TTL_SEC,
    });
    res.setCookie(TOKEN_CONSTANTS.REFRESH_TOKEN_COOKIE, result.refreshToken, {
      httpOnly: TOKEN_CONSTANTS.COOKIE_HTTP_ONLY,
      secure: TOKEN_CONSTANTS.COOKIE_SECURE,
      sameSite: TOKEN_CONSTANTS.COOKIE_SAME_SITE,
      path: '/',
      maxAge: TOKEN_CONSTANTS.REFRESH_TOKEN_TTL_SEC,
    });

    return result;
  }
}

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
import type {
  CommonErrorResponseDto,
  CommonMessageResponseDto,
} from '../../common/dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * @summary 회원가입
   * @tag auth
   * 
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
   * @summary 로그인
   * @tag auth
   * 
   */
  @TypedException<CommonErrorResponseDto>({
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
   *
   * @summary 리프레시 토큰 로그인
   * @tag auth
   *
   */
  @TypedException<CommonErrorResponseDto>({
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

  /**
   * @summary 로그아웃
   * @tag auth
   *
   */
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.UNAUTHORIZED,
    description: '로그인 실패',
  })
  @HttpCode(200)
  @TypedRoute.Post('/sign_out')
  authSignOut(
    @Res({ passthrough: true }) res: FastifyReply,
  ): CommonMessageResponseDto {
    res.clearCookie(TOKEN_CONSTANTS.ACCESS_TOKEN_COOKIE);
    res.clearCookie(TOKEN_CONSTANTS.REFRESH_TOKEN_COOKIE);
    return { message: ' 성공' };
  }

  /**
   * @summary 회원가입
   * @tag auth
   *
   */

  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.CONFLICT,
    description: '이메일 중복',
  })
  @TypedRoute.Post('/sign_up')
  authSignUp(@TypedBody() body: SignUpRequestDto): Promise<SignUpResponseDto> {
    return this.authService.signUp(body);
  }
}

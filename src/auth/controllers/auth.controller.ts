import { AuthService } from '../services';
import { TypedBody, TypedException, TypedRoute } from '@nestia/core';
import type { LoginRequestDto, LoginResponseDto } from '../dtos';
import {
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
  authSignIn(@TypedBody() body: LoginRequestDto): Promise<LoginResponseDto> {
    return this.authService.login(body);
  }
}

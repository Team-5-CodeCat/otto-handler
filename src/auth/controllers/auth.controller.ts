import { AuthService } from '../services';
import { TypedBody, TypedRoute } from '@nestia/core';
import type { LoginRequestDto, LoginResponseDto } from '../dtos';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * @tag auth
   * 로그인
   */
  @TypedRoute.Post('/sign_in')
  authSignIn(@TypedBody() body: LoginRequestDto): Promise<LoginResponseDto> {
    return this.authService.login(body);
  }
}

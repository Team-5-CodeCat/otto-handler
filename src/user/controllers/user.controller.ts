import { Controller, HttpCode } from '@nestjs/common';
import { UserService } from '../services';
import { TypedBody, TypedException, TypedRoute } from '@nestia/core';
import type { SignUpRequestDto } from '../dto';
import type { SignUpResponseDto } from '../dto';
import { ConflictException, HttpStatus } from '@nestjs/common';
import { UserErrorEnum } from '../constants';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * @tag user
   * 회원가입
   */
  @TypedException<ConflictException>({
    status: HttpStatus.CONFLICT,
    description: UserErrorEnum.EMAIL_ALREADY_EXISTS,
  })
  @TypedRoute.Post('/sign_up')
  userSignUP(@TypedBody() body: SignUpRequestDto): Promise<SignUpResponseDto> {
    return this.userService.signUp(body);
  }
}

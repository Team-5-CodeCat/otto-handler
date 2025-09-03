import {
  Controller,
  ForbiddenException,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserService } from '../services';
import { TypedException, TypedRoute } from '@nestia/core';
import { AuthGuard } from '../../common/decorators/role-guard';
import type { IRequestType } from '../../common/type';
import type { UserInfoResponse } from '../dto/response/user-info-response';
import type { CommonErrorResponseDto } from '../../common/dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   *
   * @summary 내 정보 구해오기
   * @tag user
   */
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.UNAUTHORIZED,
    description: '로그인 필요',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.FORBIDDEN,
    description: '권한 없음',
  })
  @AuthGuard()
  @TypedRoute.Get('/')
  userMyInfo(@Req() request: IRequestType): UserInfoResponse {
    return request.user;
  }
}

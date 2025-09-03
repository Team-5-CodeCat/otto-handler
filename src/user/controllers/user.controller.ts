import {
  Controller,
  ForbiddenException,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserService } from '../services';
import { TypedException, TypedRoute } from '@nestia/core';
import { UserRole } from '../../common/decorators/role-guard';
import type { IRequestType } from '../../common/type';
import type { UserInfoResponse } from '../dto/response/user-info-response';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * @tag user
   * 내 정보 구해오기
   */
  @TypedException<ForbiddenException>({
    status: HttpStatus.UNAUTHORIZED,
    description: '로그인 필요',
  })
  @TypedException<ForbiddenException>({
    status: HttpStatus.FORBIDDEN,
    description: '권한 없음',
  })
  @UseGuards(UserRole)
  @TypedRoute.Get('/')
  userMyInfo(@Req() request: IRequestType): UserInfoResponse {
    return request.user;
  }
}

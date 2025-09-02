import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginRequestDto, LoginResponseDto } from '../dtos';
import { AuthErrorEnum, AuthResponseEnum } from '../constants';

@Injectable()
export class AuthService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * 로그인
   * @param email
   * @param password
   */
  async login({ email, password }: LoginRequestDto): Promise<LoginResponseDto> {
    const user = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException(AuthErrorEnum.LOGIN_FAIL);
    }
    console.log(user);

    const passwordValid = await bcrypt.compare(password, user.password ?? '');

    if (!passwordValid) {
      throw new UnauthorizedException(AuthErrorEnum.LOGIN_FAIL);
    }

    return {
      message: AuthResponseEnum.LOGIN_SUCCESS,
    };
  }

  /**
   * 비밀번호 해시
   * @param password
   */
  async hashPassword(password: string) {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }
}

import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcrypt';
import type { SignUpResponseDto } from '../dto';
import { SignUpRequestDto } from '../dto';
import { UserErrorEnum, UserResponseEnum } from '../constants';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * 회원가입
   */
  async signUp({
    email,
    password,
    username,
  }: SignUpRequestDto): Promise<SignUpResponseDto> {
    const exists = await this.prismaService.user.findUnique({
      where: { email },
    });
    if (exists) {
      throw new ConflictException(UserErrorEnum.EMAIL_ALREADY_EXISTS);
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    await this.prismaService.user.create({
      data: {
        email,
        password: passwordHash,
        name: username,
      },
    });
    return { message: UserResponseEnum.SIGN_UP_SUCCESS };
  }
}

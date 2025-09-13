import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { UserInfoResponse } from '../dto/response';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * 사용자 정보 조회
   */
  async getUserInfo(userId: string): Promise<UserInfoResponse> {
    const user = await this.prismaService.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        username: true,
        email: true,
        profileImageUrl: true,
      },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }

    return {
      user_id: user.userId,
      nickname: user.username,
      email: user.email,
      profile_image_url: user.profileImageUrl,
    };
  }
}

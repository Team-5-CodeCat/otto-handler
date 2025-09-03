import { MemberRole } from '@prisma/client';

export interface UserInfoResponse {
  user_id: number;
  nickname: string;
  email: string;
  role: MemberRole;
}

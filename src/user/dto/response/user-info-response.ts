import { MemberRole } from '@prisma/client';

export interface UserInfoResponse {
  user_id: string;
  nickname: string;
  email: string;
  role: MemberRole;
}

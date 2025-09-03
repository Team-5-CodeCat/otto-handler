import { FastifyRequest } from 'fastify';
import { MemberRole } from '@prisma/client';

export interface IRequestType extends FastifyRequest {
  user: {
    user_id: number;
    nickname: string;
    email: string;
    role: MemberRole;
  };
}

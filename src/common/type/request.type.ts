import { FastifyRequest } from 'fastify';
import { UserRole } from '../decorators/role-guard';

export interface IRequestType extends FastifyRequest {
  user: {
    user_id: string;
    nickname: string;
    email: string;
    role: UserRole;
  };
}

// roles.decorator.ts
import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { MemberRole } from '@prisma/client';
import { AuthGuard } from '../guards/auth.guard';

export const ROLES_KEY = Symbol('roles');
export const Roles = (...roles: MemberRole[]) => SetMetadata(ROLES_KEY, roles);

export const UserRole = (roles?: MemberRole | MemberRole[]) => {
  const decorators = [UseGuards(AuthGuard)];

  if (roles) {
    const roleArray = Array.isArray(roles) ? roles : [roles];
    decorators.push(Roles(...roleArray));
  }

  return applyDecorators(...decorators);
};

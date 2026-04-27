import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Role } from '@prisma/client';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export interface AuthContext {
  userId: string;
  orgId: string;
  role: Role;
  email: string;
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthContext => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as AuthContext;
  },
);

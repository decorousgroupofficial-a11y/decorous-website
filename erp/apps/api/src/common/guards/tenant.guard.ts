import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@prisma/client';
import { IS_PUBLIC_KEY, ROLES_KEY, AuthContext } from '../decorators/auth.decorators';

/**
 * TenantGuard — two responsibilities:
 *   1. Ensure the authenticated user has an org context (multi-tenant invariant).
 *   2. If @Roles(...) metadata is present, enforce role-based access.
 *
 * All Prisma queries in services MUST also scope by `req.user.orgId` —
 * this guard is defense-in-depth, not a substitute for query-level filters.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user as AuthContext | undefined;

    if (!user?.orgId) {
      throw new ForbiddenException('Missing tenant context');
    }

    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (required && required.length > 0 && !required.includes(user.role)) {
      throw new ForbiddenException(
        `Role ${user.role} not permitted. Required: ${required.join(', ')}`,
      );
    }
    return true;
  }
}

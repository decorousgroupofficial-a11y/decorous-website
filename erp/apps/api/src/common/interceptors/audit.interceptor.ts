import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthContext } from '../decorators/auth.decorators';

/**
 * AuditInterceptor — writes an audit_log row for every successful mutation.
 * Mutations identified by HTTP verb (POST/PUT/PATCH/DELETE).
 *
 * Service layer is the source of truth; this interceptor is a backstop
 * so that no mutation ever escapes the audit trail.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const method: string = req.method;

    const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    if (!mutating) return next.handle();

    const user = req.user as AuthContext | undefined;
    const action = `${method} ${req.originalUrl ?? req.url}`;

    return next.handle().pipe(
      tap(async () => {
        if (!user?.orgId) return;
        try {
          await this.prisma.auditLog.create({
            data: {
              orgId: user.orgId,
              actorId: user.userId,
              action,
              entityType: req.route?.path ?? 'unknown',
              entityId: req.params?.id ?? '—',
              ipAddress: req.ip,
              userAgent: req.headers['user-agent']?.toString(),
            },
          });
        } catch {
          // Never fail the request because of audit log write.
          // Errors are surfaced via observability, not HTTP.
        }
      }),
    );
  }
}

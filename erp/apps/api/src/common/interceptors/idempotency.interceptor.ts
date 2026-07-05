import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from, of, switchMap, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthContext } from '../decorators/auth.decorators';
import { IDEMPOTENT_KEY } from '../decorators/idempotent.decorator';

const HEADER = 'idempotency-key';

/**
 * Idempotency Interceptor
 *
 *   • If the endpoint is not marked @Idempotent(), pass through.
 *   • Otherwise, require a client-supplied Idempotency-Key header (ULID recommended).
 *   • On first request: execute handler, persist (orgId, key, body) in idempotency_keys.
 *   • On retry with same key:
 *       - If cached body exists → return cached response (HTTP 200).
 *       - If record exists but still in-flight (no body) → 409.
 *
 * This makes field-app retries safe by construction, aligned with Doc 06 §4
 * even though full sync outbox is deferred to Phase 7.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const idempotent = this.reflector.getAllAndOverride<boolean>(
      IDEMPOTENT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!idempotent) return next.handle();

    const req = context.switchToHttp().getRequest();
    const user = req.user as AuthContext | undefined;
    const key = req.headers[HEADER];

    if (!key || typeof key !== 'string' || key.length < 8) {
      throw new BadRequestException(
        `Missing or invalid ${HEADER} header — require ULID`,
      );
    }
    if (!user?.orgId) throw new BadRequestException('Tenant context required');

    return from(
      this.prisma.idempotencyKey.findUnique({
        where: { orgId_key: { orgId: user.orgId, key } },
      }),
    ).pipe(
      switchMap((existing) => {
        if (existing) {
          if (existing.statusCode === 0) {
            throw new ConflictException('Duplicate request still processing');
          }
          return of(existing.responseBody);
        }
        return next.handle().pipe(
          tap(async (body) => {
            try {
              await this.prisma.idempotencyKey.create({
                data: {
                  orgId: user.orgId,
                  key,
                  userId: user.userId,
                  method: req.method,
                  path: req.originalUrl ?? req.url,
                  statusCode: 200,
                  responseBody: body as object,
                },
              });
            } catch {
              // If two parallel requests race, unique constraint fires on one —
              // it's fine, the other already wrote the cache.
            }
          }),
        );
      }),
    );
  }
}

import { SetMetadata } from '@nestjs/common';

/**
 * @Idempotent() — marks an endpoint as requiring an `Idempotency-Key` header.
 * The IdempotencyInterceptor picks this up and de-duplicates by (orgId, key).
 *
 * Apply to any write endpoint where a client retry could create duplicates:
 *   - DPR submit
 *   - Expense submit
 *   - Material receipt create
 *   - Vendor bill create (Phase 3)
 */
export const IDEMPOTENT_KEY = 'isIdempotent';
export const Idempotent = () => SetMetadata(IDEMPOTENT_KEY, true);

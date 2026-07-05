// ─────────────────────────────────────────────────────────────────────────────
// @decorous/types — shared TypeScript contracts between api, web, mobile.
// Keep enums/DTOs lean; Prisma types stay private to the api package.
// ─────────────────────────────────────────────────────────────────────────────

export type Role =
  | 'OWNER'
  | 'ACCOUNTANT'
  | 'PM'
  | 'ENGINEER'
  | 'STOREKEEPER'
  | 'VIEWER';

export type ApprovalStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'VOID';

export type SourceType =
  | 'EXPENSE'
  | 'MATERIAL_RECEIPT'
  | 'VENDOR_BILL'
  | 'PAYMENT'
  | 'DPR';

export type ProjectStatus =
  | 'PLANNED'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'ARCHIVED';

export type Weather = 'SUNNY' | 'CLOUDY' | 'RAINY' | 'STORMY';

export type MaterialCategory =
  | 'CEMENT'
  | 'STEEL'
  | 'AGGREGATE'
  | 'SAND'
  | 'BRICK'
  | 'ELECTRICAL'
  | 'PLUMBING'
  | 'PAINT'
  | 'WOOD'
  | 'TILES'
  | 'HARDWARE'
  | 'CONSUMABLE'
  | 'OTHER';

/**
 * Reversal reason codes (per Doc 09 §1.3).
 * Frozen until Phase 2 — kept here for early UI discoverability.
 */
export type ReversalReason =
  | 'DUP_ENTRY'
  | 'WRONG_VENDOR'
  | 'WRONG_PROJECT'
  | 'RATE_MISMATCH'
  | 'GST_CORRECTION'
  | 'QTY_CORRECTION'
  | 'CANCELLED_BILL'
  | 'FY_CLOSING_ADJ'
  | 'OTHER';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  orgId: string;
  role: Role;
  email: string;
}

/** Money is always integer paise — never float. */
export type Paise = number;

export interface ProjectSummary {
  id: string;
  code: string;
  name: string;
  status: ProjectStatus;
  clientName: string | null;
  location: string | null;
  budgetCents: Paise | null;
  currency: string;
  startDate: string | null;
  expectedEndDate: string | null;
}

export interface ApprovalSummary {
  id: string;
  targetType: SourceType;
  targetId: string;
  amountCents: Paise | null;
  currency: string;
  status: ApprovalStatus;
  requiredRole: Role;
  requestedById: string;
  createdAt: string;
}

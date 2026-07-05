import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import type { Role, SourceType, ApprovalStatus } from '@prisma/client';

/**
 * Maker-Checker Approval Engine (CTO Rule 3).
 *
 * Design rules (binding — see Doc 09 §1.1):
 *   1. Maker and Checker cannot be the same user (enforced here and at DB trigger later).
 *   2. Approval matrix determines required role per (targetType, amount).
 *   3. Approver must supply PIN for any amount >= ₹50,000 (5,000,000 paise).
 *   4. Every action writes an ApprovalEvent row (audit).
 *   5. Rejection requires a reason.
 *
 * NOTE: This module DOES NOT write to the ledger. When a target is APPROVED,
 * it flips the target row's `approvalStatus` to APPROVED but does NOT post
 * journal entries. Ledger posting is Phase 2 and gated by CA sign-off.
 */
@Injectable()
export class ApprovalsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Compute the required checker role for a given transaction.
   * Defaults below are sensible; in Phase 1 these will be org-configurable.
   */
  private requiredRole(
    targetType: SourceType,
    amountCents: bigint | null,
  ): Role | 'AUTO' {
    const amt = amountCents ?? 0n;
    switch (targetType) {
      case 'EXPENSE':
        if (amt <= 500_000n) return 'AUTO';        // ≤ ₹5,000
        if (amt <= 2_500_000n) return 'PM';        // ≤ ₹25,000
        return 'OWNER';
      case 'MATERIAL_RECEIPT':
        return 'PM';
      case 'DPR':
        return 'PM';
      case 'VENDOR_BILL':
      case 'PAYMENT':
        if (amt <= 5_000_000n) return 'PM';        // ≤ ₹50,000
        return 'OWNER';
      default:
        return 'OWNER';
    }
  }

  async request(input: {
    orgId: string;
    requestedById: string;
    targetType: SourceType;
    targetId: string;
    amountCents: bigint | null;
  }) {
    const required = this.requiredRole(input.targetType, input.amountCents);

    // Auto-approve small items — but still leave an Approval + ApprovalEvent for audit.
    if (required === 'AUTO') {
      return this.prisma.$transaction(async (tx) => {
        const approval = await tx.approval.create({
          data: {
            orgId: input.orgId,
            targetType: input.targetType,
            targetId: input.targetId,
            amountCents: input.amountCents,
            status: 'APPROVED',
            requiredRole: 'ENGINEER',
            requestedById: input.requestedById,
            approverId: input.requestedById,
            decidedAt: new Date(),
          },
        });
        await tx.approvalEvent.create({
          data: {
            approvalId: approval.id,
            action: 'AUTO_APPROVED',
            actorId: input.requestedById,
            actorRole: 'ENGINEER',
          },
        });
        return approval;
      });
    }

    return this.prisma.approval.create({
      data: {
        orgId: input.orgId,
        targetType: input.targetType,
        targetId: input.targetId,
        amountCents: input.amountCents,
        status: 'PENDING',
        requiredRole: required,
        requestedById: input.requestedById,
        slaDueAt: new Date(
          Date.now() + (required === 'OWNER' ? 48 : 24) * 3_600_000,
        ),
      },
    });
  }

  async decide(input: {
    orgId: string;
    approvalId: string;
    actorId: string;
    actorRole: Role;
    action: 'APPROVE' | 'REJECT';
    pin?: string;
    comment?: string;
    rejectionReason?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const approval = await this.prisma.approval.findFirst({
      where: { id: input.approvalId, orgId: input.orgId },
    });
    if (!approval) throw new NotFoundException('Approval not found');
    if (approval.status !== 'PENDING') {
      throw new BadRequestException(`Approval already ${approval.status}`);
    }

    // Maker ≠ Checker
    if (approval.requestedById === input.actorId) {
      throw new ForbiddenException('Maker cannot approve own request');
    }

    // Role gate
    if (approval.requiredRole !== input.actorRole && input.actorRole !== 'OWNER') {
      throw new ForbiddenException(
        `Role ${input.actorRole} cannot decide; required ${approval.requiredRole}`,
      );
    }

    // PIN required above ₹50,000
    const PIN_THRESHOLD = 5_000_000n;
    let pinVerified = false;
    if ((approval.amountCents ?? 0n) >= PIN_THRESHOLD) {
      if (!input.pin) throw new BadRequestException('PIN required for this amount');
      const user = await this.prisma.user.findUnique({ where: { id: input.actorId } });
      if (!user?.pinHash) throw new BadRequestException('PIN not set — contact admin');
      pinVerified = await argon2.verify(user.pinHash, input.pin);
      if (!pinVerified) throw new ForbiddenException('Invalid PIN');
    }

    if (input.action === 'REJECT' && !input.rejectionReason) {
      throw new BadRequestException('Rejection reason required');
    }

    const nextStatus: ApprovalStatus =
      input.action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.approval.update({
        where: { id: approval.id },
        data: {
          status: nextStatus,
          approverId: input.actorId,
          decidedAt: new Date(),
          comment: input.comment,
          rejectionReason: input.rejectionReason,
        },
      });

      await tx.approvalEvent.create({
        data: {
          approvalId: approval.id,
          action: input.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          actorId: input.actorId,
          actorRole: input.actorRole,
          pinVerified,
          comment: input.comment,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      });

      // Propagate to the target entity's approvalStatus.
      await this.propagate(tx, approval.targetType, approval.targetId, nextStatus);

      return updated;
    });
  }

  private async propagate(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    targetType: SourceType,
    targetId: string,
    status: ApprovalStatus,
  ) {
    switch (targetType) {
      case 'EXPENSE':
        await tx.expense.update({ where: { id: targetId }, data: { approvalStatus: status } });
        break;
      case 'MATERIAL_RECEIPT':
        await tx.materialReceipt.update({
          where: { id: targetId },
          data: { approvalStatus: status },
        });
        break;
      case 'DPR':
        await tx.dpr.update({ where: { id: targetId }, data: { approvalStatus: status } });
        break;
      // VENDOR_BILL / PAYMENT are Phase 3.
      default:
        break;
    }
  }

  listPending(orgId: string) {
    return this.prisma.approval.findMany({
      where: { orgId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
  }
}

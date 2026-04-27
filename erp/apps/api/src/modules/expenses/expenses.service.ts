import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalsService } from '../approvals/approvals.service';

/**
 * Expenses — petty cash / site expense capture.
 *
 * LEDGER FREEZE (CTO Rule 1):
 *   This module captures the expense and routes it through Approvals.
 *   It does NOT post to the general ledger. The `ledgerPosted` flag stays
 *   false; Phase 2 will introduce a separate service that posts approved
 *   expenses to the journal.
 */
@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvals: ApprovalsService,
  ) {}

  list(orgId: string, projectId?: string) {
    return this.prisma.expense.findMany({
      where: {
        orgId,
        deletedAt: null,
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { occurredOn: 'desc' },
      take: 500,
    });
  }

  async get(orgId: string, id: string) {
    const e = await this.prisma.expense.findFirst({
      where: { id, orgId, deletedAt: null },
    });
    if (!e) throw new NotFoundException();
    return e;
  }

  async createDraft(input: {
    orgId: string;
    capturedById: string;
    projectId: string;
    purpose: string;
    category: string;
    amountCents: bigint;
    currency?: string;
    vendorName?: string;
    billPhotoKey?: string;
    occurredOn: Date;
  }) {
    if (input.amountCents <= 0n) {
      throw new BadRequestException('Amount must be positive');
    }
    if (!input.billPhotoKey) {
      throw new BadRequestException('Bill photo is required');
    }
    const project = await this.prisma.project.findFirst({
      where: { id: input.projectId, orgId: input.orgId, deletedAt: null },
    });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.expense.create({
      data: {
        orgId: input.orgId,
        projectId: input.projectId,
        capturedById: input.capturedById,
        purpose: input.purpose,
        category: input.category,
        amountCents: input.amountCents,
        currency: input.currency ?? 'INR',
        vendorName: input.vendorName,
        billPhotoKey: input.billPhotoKey,
        occurredOn: input.occurredOn,
        approvalStatus: 'DRAFT',
        sourceType: 'EXPENSE',
        ledgerPosted: false,
      },
    });
  }

  async submit(orgId: string, id: string, userId: string) {
    const expense = await this.get(orgId, id);
    if (expense.approvalStatus !== 'DRAFT') {
      throw new BadRequestException(`Expense already ${expense.approvalStatus}`);
    }

    const approval = await this.approvals.request({
      orgId,
      requestedById: userId,
      targetType: 'EXPENSE',
      targetId: expense.id,
      amountCents: expense.amountCents,
    });

    return this.prisma.expense.update({
      where: { id: expense.id },
      data: {
        approvalStatus: approval.status === 'APPROVED' ? 'APPROVED' : 'PENDING',
        approvalId: approval.id,
      },
    });
  }
}

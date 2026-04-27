import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalsService } from '../approvals/approvals.service';
import type { Weather } from '@prisma/client';

/**
 * DPR (Daily Progress Report) — CTO Rule 4: sacred module.
 * Target: end-to-end entry in ≤ 10 seconds on the field.
 *
 * Rules:
 *   - One DPR per (project, reportDate, capturedBy) — unique index in schema.
 *   - Minimum 2 photos enforced at service layer.
 *   - On submit: DRAFT → PENDING (approval created for PM), DPR is NOT ledger.
 *   - PM approves/rejects via approvals endpoint.
 */
@Injectable()
export class DprService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvals: ApprovalsService,
  ) {}

  list(orgId: string, projectId?: string, fromDate?: Date, toDate?: Date) {
    return this.prisma.dpr.findMany({
      where: {
        orgId,
        ...(projectId ? { projectId } : {}),
        ...(fromDate || toDate
          ? {
              reportDate: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
      },
      orderBy: { reportDate: 'desc' },
      take: 200,
    });
  }

  async get(orgId: string, id: string) {
    const d = await this.prisma.dpr.findFirst({ where: { id, orgId } });
    if (!d) throw new NotFoundException();
    return d;
  }

  async createDraft(input: {
    orgId: string;
    capturedById: string;
    projectId: string;
    reportDate: Date;
    workNarrative: string;
    activityTags: string[];
    weather?: Weather;
    blockers?: string;
    labourCounts: Record<string, Record<string, number>>;
    photoKeys: string[];
    gpsLat?: number;
    gpsLng?: number;
    gpsAccuracyM?: number;
  }) {
    if (input.photoKeys.length < 2) {
      throw new BadRequestException('At least 2 photos required');
    }

    // ensure project belongs to org
    const project = await this.prisma.project.findFirst({
      where: { id: input.projectId, orgId: input.orgId, deletedAt: null },
    });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.dpr.create({
      data: {
        orgId: input.orgId,
        projectId: input.projectId,
        reportDate: input.reportDate,
        workNarrative: input.workNarrative,
        activityTags: input.activityTags,
        weather: input.weather,
        blockers: input.blockers,
        labourCounts: input.labourCounts,
        photoKeys: input.photoKeys,
        gpsLat: input.gpsLat,
        gpsLng: input.gpsLng,
        gpsAccuracyM: input.gpsAccuracyM,
        capturedById: input.capturedById,
        approvalStatus: 'DRAFT',
      },
    });
  }

  /** Transition DRAFT → PENDING and create an Approval for a PM to decide. */
  async submit(orgId: string, id: string, userId: string) {
    const dpr = await this.get(orgId, id);
    if (dpr.approvalStatus !== 'DRAFT') {
      throw new BadRequestException(`DPR already ${dpr.approvalStatus}`);
    }

    const approval = await this.approvals.request({
      orgId,
      requestedById: userId,
      targetType: 'DPR',
      targetId: dpr.id,
      amountCents: null,
    });

    return this.prisma.dpr.update({
      where: { id: dpr.id },
      data: { approvalStatus: 'PENDING', approvalId: approval.id },
    });
  }
}

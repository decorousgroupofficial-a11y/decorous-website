import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Role } from '@prisma/client';

/**
 * Escalation Service — runs on a cron (to be wired in Phase 1 deploy).
 *
 * Rules (Doc 09 §1.1 + CTO Phase 1 ask):
 *   • Every approval has an SLA: 24h for PM, 48h for OWNER.
 *   • If slaDueAt has passed and status is still PENDING → escalate:
 *       - ENGINEER  → PM
 *       - PM        → OWNER
 *       - OWNER     → stays with OWNER, but flagged in dashboard
 *   • An ApprovalEvent with action=ESCALATED is recorded.
 *   • Notifications hook (WhatsApp/email) is a TODO for Phase 5.
 *
 * Phase 1 scope: implement the logic; schedule in Phase 1 deploy via
 * @nestjs/schedule + cron "* /10 * * * *" (every 10 min).
 */
@Injectable()
export class EscalationService {
  private readonly logger = new Logger(EscalationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Returns the next role up the chain. */
  private nextRole(current: Role): Role | null {
    switch (current) {
      case 'ENGINEER':
        return 'PM';
      case 'PM':
        return 'OWNER';
      case 'OWNER':
        return 'OWNER'; // stuck at owner — will be flagged but not moved
      default:
        return null;
    }
  }

  /** SLA in milliseconds based on required role. */
  static slaFor(role: Role): number {
    return role === 'OWNER' ? 48 * 3600_000 : 24 * 3600_000;
  }

  async sweep(): Promise<{ escalated: number; stuck: number }> {
    const now = new Date();
    const overdue = await this.prisma.approval.findMany({
      where: {
        status: 'PENDING',
        slaDueAt: { lt: now },
        escalatedAt: null,
      },
      take: 500,
    });

    let escalated = 0;
    let stuck = 0;

    for (const a of overdue) {
      const next = this.nextRole(a.requiredRole);
      if (!next || next === a.requiredRole) {
        stuck += 1;
        continue;
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.approval.update({
          where: { id: a.id },
          data: {
            escalatedAt: now,
            escalatedToRole: next,
            requiredRole: next,
            // Extend SLA by the new role's window
            slaDueAt: new Date(now.getTime() + EscalationService.slaFor(next)),
          },
        });
        await tx.approvalEvent.create({
          data: {
            approvalId: a.id,
            action: 'ESCALATED',
            actorId: 'system',
            actorRole: next,
            comment: `Escalated from ${a.requiredRole} to ${next} after SLA breach`,
          },
        });
      });

      escalated += 1;
    }

    this.logger.log(`[escalation] swept: escalated=${escalated} stuck=${stuck}`);
    return { escalated, stuck };
  }
}

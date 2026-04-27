import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EscalationService } from '../modules/approvals/escalation.service';

/**
 * SchedulerService — runs the approval SLA sweep every 10 minutes.
 *
 * Kept simple with setInterval to avoid a hard dependency on @nestjs/schedule
 * in Phase 0. For production: prefer @nestjs/schedule + @Cron for proper
 * cron semantics, process lifecycle, and graceful shutdown.
 */
@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);
  private timer?: NodeJS.Timeout;
  private readonly INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

  constructor(private readonly escalation: EscalationService) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;

    const run = async () => {
      try {
        await this.escalation.sweep();
      } catch (err) {
        this.logger.error('Escalation sweep failed', err as Error);
      }
    };

    // Fire once on boot + then every INTERVAL_MS
    setTimeout(run, 30_000);
    this.timer = setInterval(run, this.INTERVAL_MS);
    this.logger.log(`Scheduler started — escalation sweep every ${this.INTERVAL_MS / 60000} min`);
  }
}

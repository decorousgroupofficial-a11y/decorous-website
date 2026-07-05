import { Module } from '@nestjs/common';
import { ApprovalsModule } from '../modules/approvals/approvals.module';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [ApprovalsModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}

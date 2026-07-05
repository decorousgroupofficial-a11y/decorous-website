import { Module } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { ApprovalsController } from './approvals.controller';
import { EscalationService } from './escalation.service';

@Module({
  providers: [ApprovalsService, EscalationService],
  controllers: [ApprovalsController],
  exports: [ApprovalsService, EscalationService],
})
export class ApprovalsModule {}

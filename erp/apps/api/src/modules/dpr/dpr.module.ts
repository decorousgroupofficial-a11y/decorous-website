import { Module } from '@nestjs/common';
import { DprService } from './dpr.service';
import { DprController } from './dpr.controller';
import { ApprovalsModule } from '../approvals/approvals.module';

@Module({
  imports: [ApprovalsModule],
  providers: [DprService],
  controllers: [DprController],
})
export class DprModule {}

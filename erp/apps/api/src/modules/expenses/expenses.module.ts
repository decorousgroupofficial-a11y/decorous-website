import { Module } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { ApprovalsModule } from '../approvals/approvals.module';

@Module({
  imports: [ApprovalsModule],
  providers: [ExpensesService],
  controllers: [ExpensesController],
})
export class ExpensesModule {}

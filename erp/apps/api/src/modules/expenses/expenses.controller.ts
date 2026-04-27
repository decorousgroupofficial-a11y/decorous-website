import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  Min,
} from 'class-validator';
import { ExpensesService } from './expenses.service';
import {
  CurrentUser,
  type AuthContext,
} from '../../common/decorators/auth.decorators';
import { Idempotent } from '../../common/decorators/idempotent.decorator';

class CreateExpenseDto {
  @IsString() projectId!: string;
  @IsString() @MinLength(2) purpose!: string;
  @IsString() @MinLength(2) category!: string;
  @IsInt() @Min(1) amountCents!: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() vendorName?: string;
  @IsString() billPhotoKey!: string;
  @IsDateString() occurredOn!: string;
}

@ApiBearerAuth()
@ApiTags('expenses')
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly svc: ExpensesService) {}

  @Get()
  list(
    @CurrentUser() user: AuthContext,
    @Query('projectId') projectId?: string,
  ) {
    return this.svc.list(user.orgId, projectId);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: AuthContext) {
    return this.svc.get(user.orgId, id);
  }

  @Post()
  @Idempotent()
  createDraft(@Body() dto: CreateExpenseDto, @CurrentUser() user: AuthContext) {
    return this.svc.createDraft({
      orgId: user.orgId,
      capturedById: user.userId,
      projectId: dto.projectId,
      purpose: dto.purpose,
      category: dto.category,
      amountCents: BigInt(dto.amountCents),
      currency: dto.currency,
      vendorName: dto.vendorName,
      billPhotoKey: dto.billPhotoKey,
      occurredOn: new Date(dto.occurredOn),
    });
  }

  @Post(':id/submit')
  @Idempotent()
  submit(@Param('id') id: string, @CurrentUser() user: AuthContext) {
    return this.svc.submit(user.orgId, id, user.userId);
  }
}

import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import type { Request } from 'express';
import { ApprovalsService } from './approvals.service';
import { CurrentUser, type AuthContext } from '../../common/decorators/auth.decorators';

class DecideDto {
  @IsEnum({ APPROVE: 'APPROVE', REJECT: 'REJECT' })
  action!: 'APPROVE' | 'REJECT';

  @IsOptional() @IsString() @Length(4, 8) pin?: string;
  @IsOptional() @IsString() comment?: string;
  @IsOptional() @IsString() rejectionReason?: string;
}

@ApiBearerAuth()
@ApiTags('approvals')
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly svc: ApprovalsService) {}

  @Get('pending')
  pending(@CurrentUser() user: AuthContext) {
    return this.svc.listPending(user.orgId);
  }

  @Post(':id/decide')
  decide(
    @Param('id') id: string,
    @Body() dto: DecideDto,
    @CurrentUser() user: AuthContext,
    @Req() req: Request,
  ) {
    return this.svc.decide({
      orgId: user.orgId,
      approvalId: id,
      actorId: user.userId,
      actorRole: user.role,
      action: dto.action,
      pin: dto.pin,
      comment: dto.comment,
      rejectionReason: dto.rejectionReason,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']?.toString(),
    });
  }
}

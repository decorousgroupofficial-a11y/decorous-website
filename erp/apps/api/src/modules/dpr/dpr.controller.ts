import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { DprService } from './dpr.service';
import {
  CurrentUser,
  Roles,
  type AuthContext,
} from '../../common/decorators/auth.decorators';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import type { Weather } from '@prisma/client';

const WEATHERS = { SUNNY: 'SUNNY', CLOUDY: 'CLOUDY', RAINY: 'RAINY', STORMY: 'STORMY' };

class CreateDprDto {
  @IsString() projectId!: string;
  @IsDateString() reportDate!: string;
  @IsString() @MinLength(3) workNarrative!: string;
  @IsArray() @IsString({ each: true }) activityTags!: string[];
  @IsOptional() @IsEnum(WEATHERS) weather?: Weather;
  @IsOptional() @IsString() blockers?: string;
  @IsObject() labourCounts!: Record<string, Record<string, number>>;
  @IsArray() @IsString({ each: true }) @ArrayMinSize(2) photoKeys!: string[];
  @IsOptional() @IsNumber() gpsLat?: number;
  @IsOptional() @IsNumber() gpsLng?: number;
  @IsOptional() @IsNumber() gpsAccuracyM?: number;
}

@ApiBearerAuth()
@ApiTags('dpr')
@Controller('dpr')
export class DprController {
  constructor(private readonly svc: DprService) {}

  @Get()
  list(
    @CurrentUser() user: AuthContext,
    @Query('projectId') projectId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.list(
      user.orgId,
      projectId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: AuthContext) {
    return this.svc.get(user.orgId, id);
  }

  @Post()
  @Roles('ENGINEER', 'PM', 'OWNER', 'STOREKEEPER')
  @Idempotent()
  createDraft(@Body() dto: CreateDprDto, @CurrentUser() user: AuthContext) {
    return this.svc.createDraft({
      orgId: user.orgId,
      capturedById: user.userId,
      projectId: dto.projectId,
      reportDate: new Date(dto.reportDate),
      workNarrative: dto.workNarrative,
      activityTags: dto.activityTags,
      weather: dto.weather,
      blockers: dto.blockers,
      labourCounts: dto.labourCounts,
      photoKeys: dto.photoKeys,
      gpsLat: dto.gpsLat,
      gpsLng: dto.gpsLng,
      gpsAccuracyM: dto.gpsAccuracyM,
    });
  }

  @Post(':id/submit')
  @Idempotent()
  submit(@Param('id') id: string, @CurrentUser() user: AuthContext) {
    return this.svc.submit(user.orgId, id, user.userId);
  }
}

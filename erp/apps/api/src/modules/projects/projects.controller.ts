import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ProjectsService } from './projects.service';
import {
  CurrentUser,
  Roles,
  type AuthContext,
} from '../../common/decorators/auth.decorators';
import type { ProjectStatus } from '@prisma/client';

class CreateProjectDto {
  @IsString() @MinLength(2) @MaxLength(32) code!: string;
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @IsString() clientName?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsInt() @Min(0) budgetCents?: number;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() expectedEndDate?: string;
}

class UpdateProjectDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() clientName?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional()
  @IsEnum({
    PLANNED: 'PLANNED',
    ACTIVE: 'ACTIVE',
    ON_HOLD: 'ON_HOLD',
    COMPLETED: 'COMPLETED',
    ARCHIVED: 'ARCHIVED',
  })
  status?: ProjectStatus;
  @IsOptional() @IsInt() @Min(0) budgetCents?: number;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() expectedEndDate?: string;
}

@ApiBearerAuth()
@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly svc: ProjectsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthContext,
    @Query('status') status?: ProjectStatus,
  ) {
    return this.svc.list(user.orgId, status);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: AuthContext) {
    return this.svc.get(user.orgId, id);
  }

  @Post()
  @Roles('OWNER', 'PM')
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: AuthContext) {
    return this.svc.create({
      orgId: user.orgId,
      createdById: user.userId,
      code: dto.code,
      name: dto.name,
      clientName: dto.clientName,
      location: dto.location,
      budgetCents: dto.budgetCents ? BigInt(dto.budgetCents) : undefined,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      expectedEndDate: dto.expectedEndDate
        ? new Date(dto.expectedEndDate)
        : undefined,
    });
  }

  @Patch(':id')
  @Roles('OWNER', 'PM')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: AuthContext,
  ) {
    return this.svc.update(user.orgId, id, {
      ...dto,
      budgetCents: dto.budgetCents ? BigInt(dto.budgetCents) : undefined,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      expectedEndDate: dto.expectedEndDate
        ? new Date(dto.expectedEndDate)
        : undefined,
    });
  }

  @Delete(':id')
  @Roles('OWNER')
  remove(@Param('id') id: string, @CurrentUser() user: AuthContext) {
    return this.svc.softDelete(user.orgId, id);
  }
}

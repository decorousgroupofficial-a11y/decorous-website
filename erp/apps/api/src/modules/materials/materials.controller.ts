import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { MaterialsService } from './materials.service';
import {
  CurrentUser,
  Roles,
  type AuthContext,
} from '../../common/decorators/auth.decorators';
import type { MaterialCategory } from '@prisma/client';

const CATEGORIES = {
  CEMENT: 'CEMENT',
  STEEL: 'STEEL',
  AGGREGATE: 'AGGREGATE',
  SAND: 'SAND',
  BRICK: 'BRICK',
  ELECTRICAL: 'ELECTRICAL',
  PLUMBING: 'PLUMBING',
  PAINT: 'PAINT',
  WOOD: 'WOOD',
  TILES: 'TILES',
  HARDWARE: 'HARDWARE',
  CONSUMABLE: 'CONSUMABLE',
  OTHER: 'OTHER',
};

class MaterialDto {
  @IsString() @MinLength(2) sku!: string;
  @IsString() @MinLength(2) name!: string;
  @IsEnum(CATEGORIES) category!: MaterialCategory;
  @IsString() uom!: string;
  @IsOptional() @IsString() hsnCode?: string;
}

@ApiBearerAuth()
@ApiTags('materials')
@Controller('materials')
export class MaterialsController {
  constructor(private readonly svc: MaterialsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthContext,
    @Query('category') category?: MaterialCategory,
  ) {
    return this.svc.list(user.orgId, category);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: AuthContext) {
    return this.svc.get(user.orgId, id);
  }

  @Post()
  @Roles('OWNER', 'ACCOUNTANT', 'PM', 'STOREKEEPER')
  create(@Body() dto: MaterialDto, @CurrentUser() user: AuthContext) {
    return this.svc.create(user.orgId, dto);
  }

  @Patch(':id')
  @Roles('OWNER', 'ACCOUNTANT', 'PM')
  update(
    @Param('id') id: string,
    @Body() dto: Partial<MaterialDto>,
    @CurrentUser() user: AuthContext,
  ) {
    return this.svc.update(user.orgId, id, dto);
  }
}

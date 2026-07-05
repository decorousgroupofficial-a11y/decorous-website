import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { VendorsService } from './vendors.service';
import {
  CurrentUser,
  Roles,
  type AuthContext,
} from '../../common/decorators/auth.decorators';

class VendorDto {
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() gstin?: string;
  @IsOptional() @IsString() pan?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() addressLine?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() pincode?: string;
  @IsOptional() @IsString() bankAccount?: string;
  @IsOptional() @IsString() ifsc?: string;
}

@ApiBearerAuth()
@ApiTags('vendors')
@Controller('vendors')
export class VendorsController {
  constructor(private readonly svc: VendorsService) {}

  @Get()
  list(@CurrentUser() user: AuthContext) {
    return this.svc.list(user.orgId);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: AuthContext) {
    return this.svc.get(user.orgId, id);
  }

  @Post()
  @Roles('OWNER', 'ACCOUNTANT', 'PM')
  create(@Body() dto: VendorDto, @CurrentUser() user: AuthContext) {
    return this.svc.create(user.orgId, dto);
  }

  @Patch(':id')
  @Roles('OWNER', 'ACCOUNTANT', 'PM')
  update(
    @Param('id') id: string,
    @Body() dto: Partial<VendorDto>,
    @CurrentUser() user: AuthContext,
  ) {
    return this.svc.update(user.orgId, id, dto);
  }
}

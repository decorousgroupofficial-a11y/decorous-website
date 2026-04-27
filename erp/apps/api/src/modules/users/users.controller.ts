import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { UsersService } from './users.service';
import {
  CurrentUser,
  Roles,
  type AuthContext,
} from '../../common/decorators/auth.decorators';
import type { Role } from '@prisma/client';

const ROLES = {
  OWNER: 'OWNER',
  ACCOUNTANT: 'ACCOUNTANT',
  PM: 'PM',
  ENGINEER: 'ENGINEER',
  STOREKEEPER: 'STOREKEEPER',
  VIEWER: 'VIEWER',
};

class InviteDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(2) fullName!: string;
  @IsEnum(ROLES) role!: Role;
  @IsString() @MinLength(8) tempPassword!: string;
}

class SetPinDto {
  @IsString() @MinLength(4) pin!: string;
}

class ChangeRoleDto {
  @IsEnum(ROLES) role!: Role;
}

@ApiBearerAuth()
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly svc: UsersService) {}

  @Get()
  list(@CurrentUser() user: AuthContext) {
    return this.svc.listMembers(user.orgId);
  }

  @Post('invite')
  @Roles('OWNER')
  invite(@Body() dto: InviteDto, @CurrentUser() user: AuthContext) {
    return this.svc.invite({ orgId: user.orgId, ...dto });
  }

  @Post('pin')
  setPin(@Body() dto: SetPinDto, @CurrentUser() user: AuthContext) {
    return this.svc.setPin(user.userId, dto.pin);
  }

  @Patch(':userId/role')
  @Roles('OWNER')
  changeRole(
    @Param('userId') userId: string,
    @Body() dto: ChangeRoleDto,
    @CurrentUser() user: AuthContext,
  ) {
    return this.svc.changeRole(user.orgId, userId, dto.role);
  }
}

import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrgsService } from './orgs.service';
import { CurrentUser, type AuthContext } from '../../common/decorators/auth.decorators';

@ApiBearerAuth()
@ApiTags('orgs')
@Controller('orgs')
export class OrgsController {
  constructor(private readonly svc: OrgsService) {}

  @Get('me')
  me(@CurrentUser() user: AuthContext) {
    return this.svc.getMine(user.orgId);
  }
}

import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsInt, IsString, Min } from 'class-validator';
import { UploadsService } from './uploads.service';
import {
  CurrentUser,
  type AuthContext,
} from '../../common/decorators/auth.decorators';

const KINDS = {
  'dpr-photo': 'dpr-photo',
  'expense-bill': 'expense-bill',
  'grn-photo': 'grn-photo',
  'vendor-doc': 'vendor-doc',
};

class PresignDto {
  @IsEnum(KINDS) kind!: keyof typeof KINDS;
  @IsString() contentType!: string;
  @IsInt() @Min(1) sizeBytes!: number;
}

@ApiBearerAuth()
@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly svc: UploadsService) {}

  @Post('presign')
  @ApiOperation({
    summary: 'Get a presigned URL to upload a file directly to S3',
  })
  presign(@Body() dto: PresignDto, @CurrentUser() user: AuthContext) {
    return this.svc.presign({
      orgId: user.orgId,
      userId: user.userId,
      kind: dto.kind,
      contentType: dto.contentType,
      sizeBytes: dto.sizeBytes,
    });
  }
}

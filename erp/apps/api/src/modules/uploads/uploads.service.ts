import { BadRequestException, Injectable } from '@nestjs/common';
import { ulid } from 'ulid';

/**
 * UploadsService — issues **presigned S3 POST URLs** for direct browser/mobile uploads.
 *
 * Why this shape:
 *   • DB never stores file bytes — only S3 object keys (photoKey fields everywhere).
 *   • Client uploads directly to S3, bypassing the API (saves bandwidth, scales better).
 *   • Server signs a short-lived URL (5 min) with size + type constraints.
 *
 * NOTE: This stub returns a structure that matches AWS S3 presigned POST. Wire
 * the actual signing in Phase 1 deploy (needs @aws-sdk/client-s3 + s3-request-presigner).
 * Using a stub here keeps the API contract stable while S3 credentials are pending.
 */
@Injectable()
export class UploadsService {
  private readonly ALLOWED_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ]);
  private readonly MAX_IMAGE_BYTES = 5 * 1024 * 1024;     // 5 MB images
  private readonly MAX_PDF_BYTES = 10 * 1024 * 1024;      // 10 MB PDFs

  async presign(input: {
    orgId: string;
    userId: string;
    kind: 'dpr-photo' | 'expense-bill' | 'grn-photo' | 'vendor-doc';
    contentType: string;
    sizeBytes: number;
  }) {
    if (!this.ALLOWED_TYPES.has(input.contentType)) {
      throw new BadRequestException(
        `Content-Type ${input.contentType} not allowed`,
      );
    }
    const isPdf = input.contentType === 'application/pdf';
    const max = isPdf ? this.MAX_PDF_BYTES : this.MAX_IMAGE_BYTES;
    if (input.sizeBytes > max) {
      throw new BadRequestException(`File exceeds ${max} bytes`);
    }

    const key = `${input.orgId}/${input.kind}/${ulid()}-${input.userId}.${
      isPdf ? 'pdf' : input.contentType.split('/')[1]
    }`;

    const bucket = process.env.S3_BUCKET ?? 'decorous-erp-uploads';
    const region = process.env.S3_REGION ?? 'ap-south-1';

    // Production wiring (Phase 1 deploy):
    //   const command = new PutObjectCommand({ Bucket, Key: key, ContentType, ContentLength });
    //   const url = await getSignedUrl(s3, command, { expiresIn: 300 });
    //
    // For now we return the shape clients expect, so the UI can be built today.
    const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}?X-Amz-Signature=stub`;

    return {
      objectKey: key,
      url,
      method: 'PUT',
      headers: {
        'Content-Type': input.contentType,
      },
      expiresIn: 300,
      maxBytes: max,
    };
  }

  /** Resolve a read URL for a stored object key. Public CDN or signed GET. */
  readUrl(objectKey: string | null | undefined): string | null {
    if (!objectKey) return null;
    const cdn = process.env.S3_CDN_URL;
    const bucket = process.env.S3_BUCKET ?? 'decorous-erp-uploads';
    const region = process.env.S3_REGION ?? 'ap-south-1';
    if (cdn) return `${cdn}/${objectKey}`;
    return `https://${bucket}.s3.${region}.amazonaws.com/${objectKey}`;
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  list(orgId: string) {
    return this.prisma.vendor.findMany({
      where: { orgId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async get(orgId: string, id: string) {
    const v = await this.prisma.vendor.findFirst({ where: { id, orgId } });
    if (!v) throw new NotFoundException();
    return v;
  }

  create(orgId: string, input: Omit<import('@prisma/client').Prisma.VendorCreateInput, 'org'>) {
    return this.prisma.vendor.create({ data: { ...input, org: { connect: { id: orgId } } } });
  }

  async update(
    orgId: string,
    id: string,
    input: import('@prisma/client').Prisma.VendorUpdateInput,
  ) {
    await this.get(orgId, id);
    return this.prisma.vendor.update({ where: { id }, data: input });
  }
}

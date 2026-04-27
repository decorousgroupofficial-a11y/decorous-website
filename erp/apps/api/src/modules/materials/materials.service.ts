import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { MaterialCategory, Prisma } from '@prisma/client';

@Injectable()
export class MaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  list(orgId: string, category?: MaterialCategory) {
    return this.prisma.material.findMany({
      where: {
        orgId,
        isActive: true,
        deletedAt: null,
        ...(category ? { category } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async get(orgId: string, id: string) {
    const m = await this.prisma.material.findFirst({ where: { id, orgId } });
    if (!m) throw new NotFoundException();
    return m;
  }

  create(orgId: string, input: Omit<Prisma.MaterialCreateInput, 'org'>) {
    return this.prisma.material.create({
      data: { ...input, org: { connect: { id: orgId } } },
    });
  }

  async update(orgId: string, id: string, input: Prisma.MaterialUpdateInput) {
    await this.get(orgId, id);
    return this.prisma.material.update({ where: { id }, data: input });
  }
}

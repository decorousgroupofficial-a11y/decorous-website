import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { ProjectStatus } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    orgId: string;
    createdById: string;
    code: string;
    name: string;
    clientName?: string;
    location?: string;
    budgetCents?: bigint;
    startDate?: Date;
    expectedEndDate?: Date;
  }) {
    return this.prisma.project.create({
      data: {
        orgId: input.orgId,
        createdById: input.createdById,
        code: input.code,
        name: input.name,
        clientName: input.clientName,
        location: input.location,
        budgetCents: input.budgetCents,
        startDate: input.startDate,
        expectedEndDate: input.expectedEndDate,
      },
    });
  }

  list(orgId: string, status?: ProjectStatus) {
    return this.prisma.project.findMany({
      where: { orgId, deletedAt: null, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(orgId: string, id: string) {
    const p = await this.prisma.project.findFirst({
      where: { id, orgId, deletedAt: null },
    });
    if (!p) throw new NotFoundException('Project not found');
    return p;
  }

  async update(
    orgId: string,
    id: string,
    input: Partial<{
      name: string;
      clientName: string;
      location: string;
      status: ProjectStatus;
      budgetCents: bigint;
      startDate: Date;
      expectedEndDate: Date;
    }>,
  ) {
    await this.get(orgId, id); // existence + tenant check
    return this.prisma.project.update({ where: { id }, data: input });
  }

  async softDelete(orgId: string, id: string) {
    await this.get(orgId, id);
    return this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

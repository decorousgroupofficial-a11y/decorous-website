import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import type { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  listMembers(orgId: string) {
    return this.prisma.membership.findMany({
      where: { orgId },
      include: { user: { select: { id: true, email: true, fullName: true, isActive: true } } },
    });
  }

  async invite(input: {
    orgId: string;
    email: string;
    fullName: string;
    role: Role;
    tempPassword: string;
  }) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      // Already a user — just add membership
      const existingMembership = await this.prisma.membership.findUnique({
        where: { orgId_userId: { orgId: input.orgId, userId: existing.id } },
      });
      if (existingMembership) throw new BadRequestException('Already a member');
      return this.prisma.membership.create({
        data: { orgId: input.orgId, userId: existing.id, role: input.role },
      });
    }
    const passwordHash = await argon2.hash(input.tempPassword);
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: input.email, fullName: input.fullName, passwordHash },
      });
      return tx.membership.create({
        data: { orgId: input.orgId, userId: user.id, role: input.role },
      });
    });
  }

  async setPin(userId: string, pin: string) {
    if (!/^\d{4}$/.test(pin)) throw new BadRequestException('PIN must be 4 digits');
    const pinHash = await argon2.hash(pin);
    return this.prisma.user.update({ where: { id: userId }, data: { pinHash } });
  }

  async changeRole(orgId: string, userId: string, role: Role) {
    const m = await this.prisma.membership.findUnique({
      where: { orgId_userId: { orgId, userId } },
    });
    if (!m) throw new NotFoundException();
    return this.prisma.membership.update({
      where: { orgId_userId: { orgId, userId } },
      data: { role },
    });
  }
}

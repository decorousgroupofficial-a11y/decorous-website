import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import type { Role } from '@prisma/client';

const MAX_FAILED = 5;
const LOCK_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async signup(input: {
    email: string;
    password: string;
    fullName: string;
    orgName: string;
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) throw new BadRequestException('Email already registered');

    const passwordHash = await argon2.hash(input.password);
    const slug = input.orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const { user, org } = await this.prisma.$transaction(async (tx) => {
      const org = await tx.org.create({
        data: { name: input.orgName, slug: `${slug}-${Date.now().toString(36)}` },
      });
      const user = await tx.user.create({
        data: {
          email: input.email,
          fullName: input.fullName,
          passwordHash,
        },
      });
      await tx.membership.create({
        data: { orgId: org.id, userId: user.id, role: 'OWNER', acceptedAt: new Date() },
      });
      return { user, org };
    });

    return this.issueTokens(user.id, org.id, 'OWNER', user.email);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account temporarily locked');
    }

    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) {
      const failed = user.failedLogins + 1;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLogins: failed,
          lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MS) : null,
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Pick the user's primary membership (for MVP: first one accepted)
    const membership = await this.prisma.membership.findFirst({
      where: { userId: user.id, acceptedAt: { not: null } },
      orderBy: { invitedAt: 'asc' },
    });
    if (!membership) throw new UnauthorizedException('No org membership');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    return this.issueTokens(user.id, membership.orgId, membership.role, user.email);
  }

  private async issueTokens(
    userId: string,
    orgId: string,
    role: Role,
    email: string,
  ) {
    const payload = { sub: userId, orgId, role, email };
    const accessToken = await this.jwt.signAsync(payload);
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    });
    return { accessToken, refreshToken, userId, orgId, role, email };
  }
}

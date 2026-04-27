import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthContext } from '../../common/decorators/auth.decorators';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    });
  }

  async validate(payload: {
    sub: string;
    orgId: string;
    role: AuthContext['role'];
    email: string;
  }): Promise<AuthContext> {
    return {
      userId: payload.sub,
      orgId: payload.orgId,
      role: payload.role,
      email: payload.email,
    };
  }
}

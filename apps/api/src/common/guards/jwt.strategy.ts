import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;       // user id
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,  // 만료 검증 활성화
      secretOrKey: config.get<string>('app.jwtSecret') ?? 'promptguard-jwt-secret-change-in-production',
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.role !== 'admin') {
      throw new UnauthorizedException('관리자 권한이 필요합니다.');
    }
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}

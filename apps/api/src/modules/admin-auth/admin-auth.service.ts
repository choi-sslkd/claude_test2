import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AdminLoginDto } from './dto/admin-login.dto';

@Injectable()
export class AdminAuthService {
  async login(dto: AdminLoginDto) {
    const adminEmail = 'admin@promptguard.com';
    const adminPassword = 'admin1234';

    if (dto.email !== adminEmail || dto.password !== adminPassword) {
      throw new UnauthorizedException('관리자 계정 정보가 올바르지 않습니다.');
    }

    return {
      accessToken: `mock-admin-token-${randomUUID()}`,
      user: {
        id: 'admin-1',
        email: adminEmail,
        role: 'admin',
        name: 'PromptGuard Admin',
      },
    };
  }
}
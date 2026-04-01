import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID, randomBytes } from 'crypto';
import { AdminLoginDto } from './dto/admin-login.dto';

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  // 프로덕션에서는 DB + bcrypt로 교체 필요
  private readonly adminEmail = 'admin@promptguard.com';
  private readonly adminPassword = 'admin1234';

  async login(dto: AdminLoginDto) {
    if (dto.email !== this.adminEmail || dto.password !== this.adminPassword) {
      // 실패 로깅 (브루트포스 탐지용)
      this.logger.warn(
        `[AUTH FAILED] email="${dto.email}" ip=unknown reason=invalid_credentials`,
      );
      throw new UnauthorizedException('관리자 계정 정보가 올바르지 않습니다.');
    }

    // 성공 로깅
    this.logger.log(`[AUTH SUCCESS] email="${dto.email}"`);

    return {
      accessToken: randomBytes(32).toString('base64url'),  // 보안 랜덤 토큰
      user: {
        id: 'admin-1',
        email: this.adminEmail,
        role: 'admin',
        name: 'PromptGuard Admin',
      },
    };
  }
}

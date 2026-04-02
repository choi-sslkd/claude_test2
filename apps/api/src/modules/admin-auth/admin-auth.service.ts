import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminLoginDto } from './dto/admin-login.dto';

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  // 프로덕션에서는 DB + bcrypt로 교체 필요
  private readonly adminEmail = 'admin@promptguard.com';
  private readonly adminPassword = 'admin1234';

  constructor(private readonly jwtService: JwtService) {}

  async login(dto: AdminLoginDto) {
    if (dto.email !== this.adminEmail || dto.password !== this.adminPassword) {
      this.logger.warn(`[AUTH FAILED] email="${dto.email}"`);
      throw new UnauthorizedException('관리자 계정 정보가 올바르지 않습니다.');
    }

    this.logger.log(`[AUTH SUCCESS] email="${dto.email}"`);

    const payload = {
      sub: 'admin-1',
      email: this.adminEmail,
      role: 'admin',
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      expiresIn: 600,  // 10분 (초)
      user: {
        id: 'admin-1',
        email: this.adminEmail,
        role: 'admin',
        name: 'PromptGuard Admin',
      },
    };
  }
}

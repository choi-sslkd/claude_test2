import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// 관리자 API 키 검증 가드
// 헤더: x-admin-key: <ADMIN_API_KEY>
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const apiKey = req.headers['x-admin-key'];
    const validKey = this.config.get<string>('app.adminApiKey');

    if (!apiKey || apiKey !== validKey) {
      throw new UnauthorizedException('유효하지 않은 관리자 API 키입니다.');
    }
    return true;
  }
}
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { JwtStrategy } from '../../common/guards/jwt.strategy';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('app.jwtSecret') ?? 'promptguard-jwt-secret-change-in-production',
        signOptions: { expiresIn: '10m' },  // 10분 만료
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, JwtStrategy],
  exports: [JwtModule],
})
export class AdminAuthModule {}

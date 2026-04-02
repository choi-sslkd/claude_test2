import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import appConfig from './config/app.config';

import { PrismaModule } from './prisma/prisma.module';
import { RulesModule } from './modules/rules/rules.module';
import { AnalyzeModule } from './modules/analyze/analyze.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { ScoringModule } from './modules/scoring/scoring.module';
import { FileScanModule } from './modules/file-scan/file-scan.module';
import { AdminAuthModule } from './modules/admin-auth/admin-auth.module';

import { HealthController } from './modules/health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),
    PrismaModule,
    AuditLogModule,
    RulesModule,
    AnalyzeModule,
    ScoringModule,
    FileScanModule,
    AdminAuthModule,
  ],
  controllers: [
    HealthController,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

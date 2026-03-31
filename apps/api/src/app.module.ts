import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config';

import { PrismaModule } from './prisma/prisma.module';
import { RulesModule } from './modules/rules/rules.module';
import { AnalyzeModule } from './modules/analyze/analyze.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { ScoringModule } from './modules/scoring/scoring.module';
import { FileScanModule } from './modules/file-scan/file-scan.module';

import { HealthController } from './modules/health/health.controller';

import { AdminGuard } from './common/guards/admin.guard';
import { AdminAuthController } from './modules/admin-auth/admin-auth.controller';
import { AdminAuthService } from './modules/admin-auth/admin-auth.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    PrismaModule,
    AuditLogModule,
    RulesModule,
    AnalyzeModule,
    ScoringModule,
    FileScanModule,
  ],
  controllers: [
    HealthController,
    AdminAuthController,
  ],
  providers: [
    AdminGuard,
    AdminAuthService,
  ],
})
export class AppModule {}
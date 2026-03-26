import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config';
import { AnalyzeController } from './modules/analyze/analyze.controller';
import { AnalyzeService } from './modules/analyze/analyze.service';
import { RulesController } from './modules/rules/rules.controller';
import { RulesService } from './modules/rules/rules.service';
import { RulesRepository } from './modules/rules/rules.repository';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { HealthController } from './modules/health/health.controller';
import { AdminGuard } from './common/guards/admin.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    AuditLogModule,
  ],
  controllers: [
    AnalyzeController,
    RulesController,
    HealthController,
  ],
  providers: [
    AnalyzeService,
    RulesService,
    RulesRepository,
    AdminGuard,
  ],
})
export class AppModule {}
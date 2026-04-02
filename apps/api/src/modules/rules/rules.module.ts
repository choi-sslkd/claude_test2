import { Module } from '@nestjs/common';
import { WeightCalculatorModule } from '../weight-calculator/weight-calculator.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { RulesController } from './rules.controller';
import { RulesService } from './rules.service';

@Module({
  imports: [WeightCalculatorModule, AuditLogModule],
  controllers: [RulesController],
  providers: [RulesService],
  exports: [RulesService],
})
export class RulesModule {}

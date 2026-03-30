import { Module } from '@nestjs/common';
import { WeightCalculatorModule } from '../weight-calculator/weight-calculator.module';
import { RulesController } from './rules.controller';
import { RulesService } from './rules.service';

@Module({
  imports: [WeightCalculatorModule],
  controllers: [RulesController],
  providers: [RulesService],
  exports: [RulesService],
})
export class RulesModule {}

import { Module } from '@nestjs/common';
import { MlClientModule } from '../ml-client/ml-client.module';
import { WeightCalculatorService } from './weight-calculator.service';

@Module({
  imports: [MlClientModule],
  providers: [WeightCalculatorService],
  exports: [WeightCalculatorService],
})
export class WeightCalculatorModule {}

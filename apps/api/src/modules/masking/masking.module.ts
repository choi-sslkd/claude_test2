import { Module } from '@nestjs/common';
import { MaskingService } from './masking.service';

@Module({
  providers: [MaskingService],
  exports: [MaskingService],
})
export class MaskingModule {}

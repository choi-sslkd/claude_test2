import { Module } from '@nestjs/common';
import { MaskingModule } from '../masking/masking.module';
import { MlClientModule } from '../ml-client/ml-client.module';
import { FileScanController } from './file-scan.controller';
import { FileScanService } from './file-scan.service';

@Module({
  imports: [MaskingModule, MlClientModule],
  controllers: [FileScanController],
  providers: [FileScanService],
})
export class FileScanModule {}

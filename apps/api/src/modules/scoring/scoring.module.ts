import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MlClientModule } from '../ml-client/ml-client.module';
import { ScoringController } from './scoring.controller';
import { ScoringService } from './scoring.service';

@Module({
  imports: [PrismaModule, MlClientModule],
  controllers: [ScoringController],
  providers: [ScoringService],
})
export class ScoringModule {}

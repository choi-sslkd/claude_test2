import { Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuditLogController } from './audit-log.controller';

@Module({
  providers: [AuditLogService],
  controllers: [AuditLogController],
  exports: [AuditLogService],   // 다른 모듈에서 주입 가능하도록 export
})
export class AuditLogModule {}
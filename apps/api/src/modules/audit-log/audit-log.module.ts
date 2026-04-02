import { Module, forwardRef } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuditLogController } from './audit-log.controller';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';

@Module({
  imports: [forwardRef(() => AdminAuthModule)],  // JWT 인증용
  providers: [AuditLogService],
  controllers: [AuditLogController],
  exports: [AuditLogService],
})
export class AuditLogModule {}

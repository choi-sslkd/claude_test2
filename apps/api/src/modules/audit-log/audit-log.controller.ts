import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiSecurity } from '@nestjs/swagger';
import { AuditLogService, AuditLogType } from './audit-log.service';
import { AdminGuard } from '../../common/guards/admin.guard';

@ApiTags('Audit Logs')
@Controller('api/v1/audit-logs')
@UseGuards(AdminGuard)         // 로그 조회는 관리자 전용
@ApiSecurity('x-admin-key')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: '감사 로그 조회 (관리자)' })
  findAll(
    @Query('type') type?: AuditLogType,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.auditLogService.findAll({ type, page: +page, limit: +limit });
  }
}
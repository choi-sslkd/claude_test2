import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileScanService } from './file-scan.service';
import { ScanFileRequestDto } from './dto/scan-file-request.dto';

@ApiTags('File Scan')
@Controller('api/v1')
export class FileScanController {
  constructor(private readonly fileScanService: FileScanService) {}

  @Post('scan-file')
  @HttpCode(200)
  @ApiOperation({ summary: '파일 내용 검사 (PII + 인젝션)' })
  async scanFile(@Body() dto: ScanFileRequestDto) {
    return this.fileScanService.scan(dto.fileName, dto.content);
  }
}

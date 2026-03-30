import { IsBoolean, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRuleDto {
  @ApiProperty({ description: '탐지할 패턴 (정규식 또는 키워드)', example: 'ignore.*previous.*instructions' })
  @IsString()
  @IsNotEmpty()
  pattern: string;

  @ApiPropertyOptional({
    description: 'OWASP 카테고리 (미지정 시 CUSTOM)',
    enum: ['PROMPT_INJECTION', 'SYSTEM_PROMPT_EXTRACTION', 'JAILBREAK', 'DATA_EXFILTRATION', 'AMBIGUOUS_REQUEST', 'POLICY_BYPASS', 'SENSITIVE_DATA', 'CUSTOM'],
    example: 'PROMPT_INJECTION',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: '활성화 여부', default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '룰 버전', example: '1.0.0' })
  @IsOptional()
  @IsString()
  version?: string;
}

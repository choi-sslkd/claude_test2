import { IsBoolean, IsString, IsNotEmpty, IsOptional, MaxLength, Validate, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@ValidatorConstraint({ name: 'safeRegex', async: false })
class SafeRegexConstraint implements ValidatorConstraintInterface {
  validate(pattern: string): boolean {
    if (!pattern || pattern.length > 200) return false;
    if (pattern.length < 3) return false;  // 너무 짧은 패턴 차단
    // 모든 입력에 매칭되는 패턴 차단: .*, .+, ^.*$
    if (/^\.\*$|^\.\+$|^\^?\.\*\$?$|^\^?\.\+\$?$/.test(pattern.trim())) return false;
    // ReDoS 위험 패턴 차단: 중첩 반복자
    if (/\([^)]*[+*][^)]*\)[+*{]/.test(pattern)) return false;
    // 유효한 정규식인지 확인
    try { new RegExp(pattern); return true; } catch { return false; }
  }
  defaultMessage(): string {
    return 'pattern must be a valid regex (3-200 chars, no catch-all or nested quantifiers)';
  }
}

export class CreateRuleDto {
  @ApiProperty({ description: '탐지할 패턴 (정규식 또는 키워드)', example: 'ignore.*previous.*instructions' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Validate(SafeRegexConstraint)
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

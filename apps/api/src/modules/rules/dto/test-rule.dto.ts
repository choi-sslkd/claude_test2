import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateRuleDto } from './create-rule.dto';

export class TestRuleDto {
  @ApiPropertyOptional({ description: '기존 룰 ID' })
  @IsString() @IsOptional()
  ruleId?: string;

  @ApiPropertyOptional({ description: '임시 룰 객체 (ruleId 없을 때 사용)' })
  @IsOptional()
  rule?: CreateRuleDto;

  @ApiProperty({ description: '테스트할 프롬프트' })
  @IsString() @IsNotEmpty()
  prompt!: string;
}
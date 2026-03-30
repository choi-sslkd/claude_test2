import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { RiskLevel } from '@prisma/client';
import { CreateRuleDto } from './create-rule.dto';

export class UpdateRuleDto extends PartialType(CreateRuleDto) {
  @ApiPropertyOptional({
    description: '탐지할 패턴',
    example: 'pretend you are',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  pattern?: string;

  @ApiPropertyOptional({
    description: '위험도',
    enum: RiskLevel,
    example: RiskLevel.MEDIUM,
  })
  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @ApiPropertyOptional({
    description: '활성화 여부',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: '룰 버전',
    example: '1.0.1',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  version?: string;
}
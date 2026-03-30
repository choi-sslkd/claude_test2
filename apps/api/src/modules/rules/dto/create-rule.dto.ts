import { IsBoolean, IsEnum, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RiskLevel } from '@prisma/client';

export class CreateRuleDto {
  @ApiProperty({
    description: '탐지할 패턴',
    example: 'act as',
  })
  @IsString()
  @IsNotEmpty()
  pattern: string;

  @ApiProperty({
    description: '위험도',
    enum: RiskLevel,
    example: RiskLevel.HIGH,
  })
  @IsEnum(RiskLevel)
  riskLevel: RiskLevel;

  @ApiProperty({
    description: '활성화 여부',
    example: true,
  })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({
    description: '룰 버전',
    example: '1.0.0',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  version?: string;
}
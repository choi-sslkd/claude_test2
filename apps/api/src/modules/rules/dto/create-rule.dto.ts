import {
  IsString, IsNotEmpty, IsArray, IsEnum,
  IsBoolean, IsOptional, IsNumber, Min, ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RiskLevel } from '@prompt-guard/rule-engine';

export class CreateRuleDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiProperty() @IsString() @IsNotEmpty() description!: string;

  @ApiProperty({ enum: ['low', 'medium', 'high'] })
  @IsEnum(['low', 'medium', 'high'])
  riskLevel!: RiskLevel;

  @ApiProperty({ type: [String] })
  @IsArray() @ArrayMinSize(1)
  tags!: string[];

  @ApiProperty({ type: [String] })
  @IsArray() @ArrayMinSize(1)
  patterns!: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray() @IsOptional()
  exclusions?: string[];

  @ApiProperty() @IsBoolean() enabled!: boolean;

  @ApiProperty({ default: 100 })
  @IsNumber() @Min(0)
  priority!: number;

  @ApiProperty() @IsString() @IsNotEmpty() reasonTemplate!: string;

  @ApiPropertyOptional() @IsString() @IsOptional() rewriteTemplate?: string;
}
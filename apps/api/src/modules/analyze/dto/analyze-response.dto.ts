import { ApiProperty } from '@nestjs/swagger';
import { RiskLevel, RuleMatch } from '@prompt-guard/rule-engine';

export class AnalyzeResponseDto {
  @ApiProperty({ enum: ['low', 'medium', 'high'] })
  riskLevel!: RiskLevel;

  @ApiProperty({ type: [String] })
  tags!: string[];

  @ApiProperty({ type: [String] })
  reasons!: string[];

  @ApiProperty({ type: [String] })
  rewrites!: string[];

  @ApiProperty()
  matchedRules!: RuleMatch[];

  @ApiProperty()
  analyzedAt!: string;
}
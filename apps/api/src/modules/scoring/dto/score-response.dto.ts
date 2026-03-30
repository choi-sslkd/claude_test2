import { ApiProperty } from '@nestjs/swagger';

export class MatchedRuleResponse {
  @ApiProperty() ruleId: string;
  @ApiProperty() pattern: string;
  @ApiProperty() category: string;
  @ApiProperty() injectionContribution: number;
  @ApiProperty() ambiguityContribution: number;
}

export class ScoreResponseDto {
  @ApiProperty() prompt: string;

  @ApiProperty() injectionScore: number;
  @ApiProperty() injectionPct: string;
  @ApiProperty() injectionSeverity: string;

  @ApiProperty() ambiguityScore: number;
  @ApiProperty() ambiguityPct: string;
  @ApiProperty() ambiguitySeverity: string;

  @ApiProperty() overallRisk: string;

  @ApiProperty({ type: [MatchedRuleResponse] })
  matchedRules: MatchedRuleResponse[];

  @ApiProperty() latencyMs: number;
  @ApiProperty() analyzedAt: string;
}

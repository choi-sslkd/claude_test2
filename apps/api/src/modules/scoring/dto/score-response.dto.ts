import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MatchedRuleResponse {
  @ApiProperty() ruleId: string;
  @ApiProperty() pattern: string;
  @ApiProperty() category: string;
  @ApiProperty() injectionContribution: number;
  @ApiProperty() ambiguityContribution: number;
}

export class MaskingResponse {
  @ApiProperty() hasPII: boolean;
  @ApiProperty() maskedCount: number;
  @ApiProperty() types: string[];
  @ApiProperty() summary: string;
  @ApiPropertyOptional() maskedPrompt?: string;
}

export class MlStatusResponse {
  @ApiProperty() available: boolean;
  @ApiProperty() degraded: boolean;
  @ApiProperty() message: string;
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

  @ApiProperty({ type: MaskingResponse })
  masking: MaskingResponse;

  @ApiProperty({ type: MlStatusResponse })
  mlStatus: MlStatusResponse;

  @ApiProperty() latencyMs: number;
  @ApiProperty() analyzedAt: string;
}

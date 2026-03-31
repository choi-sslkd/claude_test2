import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MlClientService } from '../ml-client/ml-client.service';
import { MaskingService } from '../masking/masking.service';
import { riskScoreToLevel } from '../weight-calculator/owasp-factors';
import { ScoreResponseDto, MatchedRuleResponse } from './dto/score-response.dto';

@Injectable()
export class ScoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mlClient: MlClientService,
    private readonly maskingService: MaskingService,
  ) {}

  async score(prompt: string): Promise<ScoreResponseDto> {
    const start = Date.now();

    // 0. PII 마스킹
    const maskResult = this.maskingService.mask(prompt);

    // 1. Fetch active rules with weights
    const rules = await this.prisma.rule.findMany({ where: { enabled: true } });

    // 2. Get ML scores from Python API
    const ml = await this.mlClient.score(prompt);

    // 3. Pattern match each rule & compute contributions
    const matchedRules: MatchedRuleResponse[] = [];
    let maxInjection = ml.injection_score;
    let maxAmbiguity = ml.ambiguity_score;

    const normalizedPrompt = prompt.toLowerCase();

    for (const rule of rules) {
      const patternHit = this.matchPattern(normalizedPrompt, rule.pattern);
      if (!patternHit) continue;

      const injContrib = 1.0 * rule.patternWeight + ml.injection_score * rule.injectionWeight;
      const ambContrib = 1.0 * rule.patternWeight * 0.5 + ml.ambiguity_score * rule.ambiguityWeight;

      maxInjection = Math.max(maxInjection, Math.min(injContrib, 1.0));
      maxAmbiguity = Math.max(maxAmbiguity, Math.min(ambContrib, 1.0));

      matchedRules.push({
        ruleId: rule.id,
        pattern: rule.pattern,
        category: rule.category,
        injectionContribution: Math.round(injContrib * 10000) / 10000,
        ambiguityContribution: Math.round(ambContrib * 10000) / 10000,
      });
    }

    // 4. Clamp and classify
    // 패턴 매칭이 하나도 안 된 경우, ML 단독 점수를 20% 할인
    // (ML 오탐지 보정: 안전한 프롬프트가 ML만으로 HIGH가 되는 것 방지)
    const noPatternMatch = matchedRules.length === 0;
    const discountFactor = noPatternMatch ? 0.8 : 1.0;

    const injectionScore = Math.min(Math.max(maxInjection * discountFactor, 0), 1);
    const ambiguityScore = Math.min(Math.max(maxAmbiguity * discountFactor, 0), 1);

    const injectionSeverity = riskScoreToLevel(injectionScore);
    const ambiguitySeverity = riskScoreToLevel(ambiguityScore);

    // Overall = injection 기준, ambiguity는 한 단계 낮춰서 반영
    const severityOrder = ['NOTE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const injIdx = severityOrder.indexOf(injectionSeverity);
    const ambIdx = Math.max(severityOrder.indexOf(ambiguitySeverity) - 1, 0);
    const overallRisk = severityOrder[Math.max(injIdx, ambIdx)];

    return {
      prompt: maskResult.hasPII ? maskResult.maskedPrompt : prompt,
      injectionScore: Math.round(injectionScore * 10000) / 10000,
      injectionPct: `${(injectionScore * 100).toFixed(1)}%`,
      injectionSeverity,
      ambiguityScore: Math.round(ambiguityScore * 10000) / 10000,
      ambiguityPct: `${(ambiguityScore * 100).toFixed(1)}%`,
      ambiguitySeverity,
      overallRisk,
      matchedRules,
      masking: {
        hasPII: maskResult.hasPII,
        maskedCount: maskResult.matches.length,
        types: [...new Set(maskResult.matches.map((m) => m.type))],
        summary: maskResult.summary,
        maskedPrompt: maskResult.hasPII ? maskResult.maskedPrompt : undefined,
      },
      latencyMs: Date.now() - start,
      analyzedAt: new Date().toISOString(),
    };
  }

  private matchPattern(text: string, pattern: string): boolean {
    try {
      return new RegExp(pattern, 'i').test(text);
    } catch {
      return text.includes(pattern.toLowerCase());
    }
  }
}

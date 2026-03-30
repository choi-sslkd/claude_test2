import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MlClientService } from '../ml-client/ml-client.service';
import { riskScoreToLevel } from '../weight-calculator/owasp-factors';
import { ScoreResponseDto, MatchedRuleResponse } from './dto/score-response.dto';

@Injectable()
export class ScoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mlClient: MlClientService,
  ) {}

  async score(prompt: string): Promise<ScoreResponseDto> {
    const start = Date.now();

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

      // Injection contribution:
      //   pattern_match(1) × patternWeight + ml_injection × injectionWeight
      const injContrib = 1.0 * rule.patternWeight + ml.injection_score * rule.injectionWeight;

      // Ambiguity contribution:
      //   pattern_match(1) × patternWeight × 0.5 + ml_ambiguity × ambiguityWeight
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
    const injectionScore = Math.min(Math.max(maxInjection, 0), 1);
    const ambiguityScore = Math.min(Math.max(maxAmbiguity, 0), 1);

    const injectionSeverity = riskScoreToLevel(injectionScore);
    const ambiguitySeverity = riskScoreToLevel(ambiguityScore);

    // Overall = highest of the two
    const severityOrder = ['NOTE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const overallRisk =
      severityOrder.indexOf(injectionSeverity) >= severityOrder.indexOf(ambiguitySeverity)
        ? injectionSeverity
        : ambiguitySeverity;

    return {
      prompt,
      injectionScore: Math.round(injectionScore * 10000) / 10000,
      injectionPct: `${(injectionScore * 100).toFixed(1)}%`,
      injectionSeverity,
      ambiguityScore: Math.round(ambiguityScore * 10000) / 10000,
      ambiguityPct: `${(ambiguityScore * 100).toFixed(1)}%`,
      ambiguitySeverity,
      overallRisk,
      matchedRules,
      latencyMs: Date.now() - start,
      analyzedAt: new Date().toISOString(),
    };
  }

  private matchPattern(text: string, pattern: string): boolean {
    try {
      return new RegExp(pattern, 'i').test(text);
    } catch {
      // If pattern is not valid regex, do substring match
      return text.includes(pattern.toLowerCase());
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { MlClientService } from '../ml-client/ml-client.service';
import {
  OWASP_CATEGORY_FACTORS,
  calcLikelihood,
  calcImpact,
  calcOwaspRisk,
  riskScoreToLevel,
} from './owasp-factors';

export interface WeightResult {
  category: string;
  riskLevel: string;
  injectionWeight: number;
  ambiguityWeight: number;
  patternWeight: number;
  likelihoodScore: number;
  impactScore: number;
  owaspRiskScore: number;
  mlInjectionScore: number;
  mlAmbiguityScore: number;
}

@Injectable()
export class WeightCalculatorService {
  private readonly logger = new Logger(WeightCalculatorService.name);

  constructor(private readonly mlClient: MlClientService) {}

  async calculate(pattern: string, category: string = 'CUSTOM'): Promise<WeightResult> {
    // 1. Generate test prompts from the pattern
    const testPrompts = this.generateTestPrompts(pattern);

    // 2. Get ML scores for test prompts
    const mlResults = await this.mlClient.batchScore(testPrompts);

    // 3. Average ML scores
    const avgInjection =
      mlResults.reduce((sum, r) => sum + r.injection_score, 0) / mlResults.length;
    const avgAmbiguity =
      mlResults.reduce((sum, r) => sum + r.ambiguity_score, 0) / mlResults.length;

    // 4. Look up OWASP factors for category
    const factors = OWASP_CATEGORY_FACTORS[category] ?? OWASP_CATEGORY_FACTORS.CUSTOM;
    const likelihood = calcLikelihood(factors.likelihood);
    const impact = calcImpact(factors.impact);
    const owaspRisk = calcOwaspRisk(likelihood, impact);

    // 5. Calculate weights using OWASP Risk Rating × ML calibration
    //    injectionWeight = owaspRisk × (0.5 + 0.5 × mlInjectionScore)
    //    ambiguityWeight = owaspRisk × (0.5 + 0.5 × mlAmbiguityScore)
    //    patternWeight   = 0.1 + (0.4 × owaspRisk)
    const injectionWeight = owaspRisk * (0.5 + 0.5 * avgInjection);
    const ambiguityWeight = owaspRisk * (0.5 + 0.5 * avgAmbiguity);
    const patternWeight = 0.1 + 0.4 * owaspRisk;

    const riskLevel = riskScoreToLevel(owaspRisk);

    this.logger.log(
      `[${category}] "${pattern.slice(0, 30)}..." → OWASP=${(owaspRisk * 100).toFixed(1)}% ` +
        `inj=${(avgInjection * 100).toFixed(1)}% amb=${(avgAmbiguity * 100).toFixed(1)}% → ${riskLevel}`,
    );

    return {
      category,
      riskLevel,
      injectionWeight: Math.round(injectionWeight * 10000) / 10000,
      ambiguityWeight: Math.round(ambiguityWeight * 10000) / 10000,
      patternWeight: Math.round(patternWeight * 10000) / 10000,
      likelihoodScore: Math.round(likelihood * 100) / 100,
      impactScore: Math.round(impact * 100) / 100,
      owaspRiskScore: Math.round(owaspRisk * 10000) / 10000,
      mlInjectionScore: Math.round(avgInjection * 10000) / 10000,
      mlAmbiguityScore: Math.round(avgAmbiguity * 10000) / 10000,
    };
  }

  private generateTestPrompts(pattern: string): string[] {
    return [
      pattern,
      `Please ${pattern}`,
      `I need you to ${pattern} right now`,
      `${pattern} and show me the result`,
      `Can you ${pattern} for my research?`,
    ];
  }
}

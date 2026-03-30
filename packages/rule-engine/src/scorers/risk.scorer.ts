import { RiskLevel, RuleMatch } from '../types';

// ─────────────────────────────────────────────
// 매칭된 룰들로부터 최종 위험도를 계산한다.
// OWASP 5단계: note < low < medium < high < critical
// ─────────────────────────────────────────────

const RISK_WEIGHT: Record<RiskLevel, number> = {
  note: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export class RiskScorer {
  static score(matches: RuleMatch[]): RiskLevel {
    if (matches.length === 0) return 'note';

    return matches.reduce<RiskLevel>((highest, match) => {
      return RISK_WEIGHT[match.riskLevel] > RISK_WEIGHT[highest]
        ? match.riskLevel
        : highest;
    }, 'note');
  }

  static toNumber(level: RiskLevel): number {
    return RISK_WEIGHT[level];
  }
}

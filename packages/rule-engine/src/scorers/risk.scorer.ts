import { RiskLevel, RuleMatch } from '../types';

// ─────────────────────────────────────────────
// 매칭된 룰들로부터 최종 위험도를 계산한다.
// ─────────────────────────────────────────────

const RISK_WEIGHT: Record<RiskLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

export class RiskScorer {
  /**
   * 매칭된 룰 중 가장 높은 위험도를 반환
   */
  static score(matches: RuleMatch[]): RiskLevel {
    if (matches.length === 0) return 'low';

    return matches.reduce<RiskLevel>((highest, match) => {
      return RISK_WEIGHT[match.riskLevel] > RISK_WEIGHT[highest]
        ? match.riskLevel
        : highest;
    }, 'low');
  }

  /**
   * 위험도 수치 반환 (정렬 등에 활용)
   */
  static toNumber(level: RiskLevel): number {
    return RISK_WEIGHT[level];
  }
}
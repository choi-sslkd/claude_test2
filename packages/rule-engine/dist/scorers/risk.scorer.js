"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskScorer = void 0;
// ─────────────────────────────────────────────
// 매칭된 룰들로부터 최종 위험도를 계산한다.
// ─────────────────────────────────────────────
const RISK_WEIGHT = {
    low: 1,
    medium: 2,
    high: 3,
};
class RiskScorer {
    /**
     * 매칭된 룰 중 가장 높은 위험도를 반환
     */
    static score(matches) {
        if (matches.length === 0)
            return 'low';
        return matches.reduce((highest, match) => {
            return RISK_WEIGHT[match.riskLevel] > RISK_WEIGHT[highest]
                ? match.riskLevel
                : highest;
        }, 'low');
    }
    /**
     * 위험도 수치 반환 (정렬 등에 활용)
     */
    static toNumber(level) {
        return RISK_WEIGHT[level];
    }
}
exports.RiskScorer = RiskScorer;

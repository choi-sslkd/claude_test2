import { RiskLevel, RuleMatch } from '../types';
export declare class RiskScorer {
    /**
     * 매칭된 룰 중 가장 높은 위험도를 반환
     */
    static score(matches: RuleMatch[]): RiskLevel;
    /**
     * 위험도 수치 반환 (정렬 등에 활용)
     */
    static toNumber(level: RiskLevel): number;
}

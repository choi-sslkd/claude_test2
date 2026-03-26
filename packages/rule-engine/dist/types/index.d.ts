export type RiskLevel = 'low' | 'medium' | 'high';
/** 룰 데이터 구조 */
export interface PromptRule {
    id: string;
    name: string;
    description: string;
    tags: string[];
    riskLevel: RiskLevel;
    enabled: boolean;
    patterns: string[];
    exclusions?: string[];
    reasonTemplate: string;
    rewriteTemplate?: string;
    priority: number;
    version: number;
    createdAt: string;
    updatedAt: string;
}
/** 단일 룰 매칭 결과 */
export interface RuleMatch {
    ruleId: string;
    ruleName: string;
    tags: string[];
    riskLevel: RiskLevel;
    reason: string;
    rewrite?: string;
    matchedPatterns: string[];
}
/** 엔진 최종 분석 결과 */
export interface AnalyzeResult {
    riskLevel: RiskLevel;
    tags: string[];
    reasons: string[];
    rewrites: string[];
    matchedRules: RuleMatch[];
    analyzedAt: string;
}
/** 엔진 설정 옵션 */
export interface EngineOptions {
    maxRules?: number;
    stopOnFirstHigh?: boolean;
}

// ─────────────────────────────────────────────
// 공통 타입 정의 (rule-engine 패키지 전체에서 공유)
// ─────────────────────────────────────────────

export type RiskLevel = 'note' | 'low' | 'medium' | 'high' | 'critical';

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

/** OWASP 가중치가 포함된 룰 (DB 연동) */
export interface WeightedRule {
  id: string;
  pattern: string;
  riskLevel: RiskLevel;
  enabled: boolean;
  category: string;
  injectionWeight: number;
  ambiguityWeight: number;
  patternWeight: number;
  owaspRiskScore: number;
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

/** 통합 스코어링 결과 (ML + 패턴) */
export interface UnifiedScoreResult {
  injectionScore: number;
  injectionPct: string;
  injectionSeverity: RiskLevel;
  ambiguityScore: number;
  ambiguityPct: string;
  ambiguitySeverity: RiskLevel;
  overallRisk: RiskLevel;
  matchedRules: Array<{
    ruleId: string;
    pattern: string;
    category: string;
    injectionContribution: number;
    ambiguityContribution: number;
  }>;
}

/** 엔진 설정 옵션 */
export interface EngineOptions {
  maxRules?: number;
  stopOnFirstHigh?: boolean;
}

// ─────────────────────────────────────────────
// 공통 타입 정의 (rule-engine 패키지 전체에서 공유)
// ─────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high';

/** 룰 데이터 구조 */
export interface PromptRule {
  id: string;
  name: string;
  description: string;
  tags: string[];
  riskLevel: RiskLevel;
  enabled: boolean;
  patterns: string[];          // 매칭 패턴 목록
  exclusions?: string[];       // 제외 패턴 (이 패턴이 있으면 매칭 스킵)
  reasonTemplate: string;      // 위험 설명 템플릿
  rewriteTemplate?: string;    // 수정안 템플릿
  priority: number;            // 높을수록 먼저 평가 (기본 100)
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
  matchedPatterns: string[];   // 실제로 매칭된 패턴 목록 (디버깅용)
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
  maxRules?: number;           // 최대 매칭 룰 수 (기본 무제한)
  stopOnFirstHigh?: boolean;   // high 탐지 즉시 중단 여부
}
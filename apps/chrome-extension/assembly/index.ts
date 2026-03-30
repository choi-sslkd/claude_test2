import { analyzePromptScore, analyzeWithDynamicRules } from "./rule-engine";
import { getRiskLevel, getScoreAndLevel } from "./risk.scorer";

/**
 * 가장 권장되는 공식 엔트리포인트
 * - 프롬프트와 동적 룰 JSON을 받아
 * - score / riskLevel / blocked 를 포함한 JSON 문자열 반환
 */
export function analyzePrompt(prompt: string, dynamicRulesJson: string = "[]"): string {
  return getScoreAndLevel(prompt, dynamicRulesJson);
}

/**
 * 점수만 필요한 경우 사용하는 엔트리포인트
 */
export function analyzePromptOnlyScore(prompt: string): i32 {
  return analyzePromptScore(prompt);
}

/**
 * 동적 룰까지 포함한 점수만 필요한 경우 사용하는 엔트리포인트
 */
export function analyzePromptWithRulesOnlyScore(prompt: string, dynamicRulesJson: string): i32 {
  return analyzeWithDynamicRules(prompt, dynamicRulesJson);
}

/**
 * 점수를 받아 위험 등급만 반환
 */
export function analyzePromptRiskLevel(prompt: string, dynamicRulesJson: string = "[]"): string {
  const score = analyzeWithDynamicRules(prompt, dynamicRulesJson);
  return getRiskLevel(score);
}
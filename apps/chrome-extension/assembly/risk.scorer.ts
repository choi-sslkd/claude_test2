import { analyzeWithDynamicRules } from "./rule-engine";

// 위험 등급 임계치
const THRESHOLD_CRITICAL: i32 = 10;
const THRESHOLD_HIGH: i32 = 5;
const THRESHOLD_MEDIUM: i32 = 3;

/**
 * 점수를 위험 등급 문자열로 변환
 */
export function getRiskLevel(score: i32): string {
  if (score >= THRESHOLD_CRITICAL) {
    return "critical";
  }

  if (score >= THRESHOLD_HIGH) {
    return "high";
  }

  if (score >= THRESHOLD_MEDIUM) {
    return "medium";
  }

  return "low";
}

/**
 * 프롬프트와 동적 규칙 JSON을 받아
 * score / riskLevel / blocked 결과를 JSON 문자열로 반환
 */
export function getScoreAndLevel(prompt: string, dynamicRulesJson: string): string {
  const score: i32 = analyzeWithDynamicRules(prompt, dynamicRulesJson);
  const riskLevel: string = getRiskLevel(score);

  const blocked: bool = riskLevel == "high" || riskLevel == "critical";
  const blockedStr: string = blocked ? "true" : "false";

  return (
    '{"score": ' +
    score.toString() +
    ', "riskLevel": "' +
    riskLevel +
    '", "blocked": ' +
    blockedStr +
    "}"
  );
}
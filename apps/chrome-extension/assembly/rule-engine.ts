import { BaseRule } from "./rules/base.rule";
import { JailbreakRule, SystemPromptRule, ApiKeyRule } from "./rules/prompt-injection.rule";
import {
  BypassRule,
  NoAuthRule,
  PermissionRule,
  RoleplayRule,
  HypotheticalRule,
} from "./rules/puzzle-attack.rule";
import { normalizeText, containsPattern } from "./text.normalizer";

// 가중치 상수
const WEIGHT_CRITICAL: i32 = 10;
const WEIGHT_HIGH: i32 = 5;
const WEIGHT_MEDIUM: i32 = 3;
const WEIGHT_LOW: i32 = 1;

/**
 * 기본 정적 룰 목록
 */
function buildDefaultRules(): BaseRule[] {
  return [
    // INJECTION
    new JailbreakRule("rule_jailbreak", "INJECTION", WEIGHT_CRITICAL, true),
    new SystemPromptRule("rule_sysprompt", "INJECTION", WEIGHT_HIGH, true),
    new ApiKeyRule("rule_apikey", "INJECTION", WEIGHT_HIGH, true),

    // PUZZLE / INDIRECT ATTACK
    new BypassRule("rule_bypass", "PUZZLE", WEIGHT_LOW, true),
    new NoAuthRule("rule_noauth", "PUZZLE", WEIGHT_LOW, true),
    new PermissionRule("rule_permission", "PUZZLE", WEIGHT_LOW, true),
    new RoleplayRule("rule_roleplay", "PUZZLE", WEIGHT_LOW, true),
    new HypotheticalRule("rule_hypothetical", "PUZZLE", WEIGHT_LOW, true),
  ];
}

/**
 * 정적 룰만으로 점수 계산
 */
export function analyzePromptScore(prompt: string): i32 {
  const normalized: string = normalizeText(prompt);
  const rules: BaseRule[] = buildDefaultRules();

  let totalScore: i32 = 0;

  for (let i: i32 = 0; i < rules.length; i++) {
    const rule = rules[i];

    if (rule.isActive() && rule.evaluate(normalized)) {
      totalScore += rule.weight;
    }
  }

  return totalScore;
}

/**
 * 정적 룰 + 동적 룰 JSON을 합산하여 점수 계산
 */
export function analyzeWithDynamicRules(prompt: string, dynamicRulesJson: string): i32 {
  let totalScore: i32 = analyzePromptScore(prompt);
  const normalized: string = normalizeText(prompt);

  let jsonStr: string = dynamicRulesJson.trim();

  if (jsonStr.length < 2) return totalScore;
  if (jsonStr.charAt(0) != "[" || jsonStr.charAt(jsonStr.length - 1) != "]") {
    return totalScore;
  }

  jsonStr = jsonStr.substring(1, jsonStr.length - 1).trim();

  let startIdx: i32 = 0;
  let depth: i32 = 0;
  let inString: bool = false;

  for (let i: i32 = 0; i < jsonStr.length; i++) {
    const ch = jsonStr.charAt(i);

    if (ch == '"' && (i == 0 || jsonStr.charAt(i - 1) != "\\")) {
      inString = !inString;
    }

    if (!inString) {
      if (ch == "{") {
        if (depth == 0) startIdx = i;
        depth++;
      } else if (ch == "}") {
        depth--;
        if (depth == 0) {
          const block = jsonStr.substring(startIdx, i + 1);

          const pattern = extractJsonField(block, "pattern");
          const weightStr = extractJsonField(block, "weight");

          let weight: i32 = 1;
          if (weightStr.length > 0) {
            weight = i32(parseInt(weightStr));
          }

          if (pattern.length > 0 && containsPattern(normalized, normalizeText(pattern))) {
            totalScore += weight;
          }
        }
      }
    }
  }

  return totalScore;
}

/**
 * 단순 JSON 객체 문자열에서 field 값 추출
 * 문자열/숫자 둘 다 문자열 형태로 반환
 */
function extractJsonField(block: string, field: string): string {
  const keyToken = '"' + field + '"';
  const keyIdx = block.indexOf(keyToken);
  if (keyIdx < 0) return "";

  let colonIdx = keyIdx + keyToken.length;
  while (colonIdx < block.length && block.charAt(colonIdx) != ":") {
    colonIdx++;
  }
  if (colonIdx >= block.length) return "";

  let valueStart = colonIdx + 1;
  while (valueStart < block.length && block.charAt(valueStart) == " ") {
    valueStart++;
  }
  if (valueStart >= block.length) return "";

  if (block.charAt(valueStart) == '"') {
    valueStart++;
    let valueEnd = valueStart;

    while (valueEnd < block.length && block.charAt(valueEnd) != '"') {
      if (block.charAt(valueEnd) == "\\" && valueEnd + 1 < block.length) {
        valueEnd++;
      }
      valueEnd++;
    }

    return block.substring(valueStart, valueEnd);
  } else {
    let valueEnd = valueStart;
    while (
      valueEnd < block.length &&
      block.charAt(valueEnd) != "," &&
      block.charAt(valueEnd) != "}" &&
      block.charAt(valueEnd) != " "
    ) {
      valueEnd++;
    }
    return block.substring(valueStart, valueEnd).trim();
  }
}
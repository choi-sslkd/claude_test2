import { BaseRule } from "./base.rule";
import { containsPattern } from "../text.normalizer";

// ─────────────────────────────────────────────────────────────────────────────
// JailbreakRule
// 목적: AI 모델의 안전 장치를 우회하거나 무력화하려는 탈옥 시도를 탐지
// ─────────────────────────────────────────────────────────────────────────────
export class JailbreakRule extends BaseRule {
  patterns: string[];

  constructor(id: string, category: string, weight: i32, enabled: bool) {
    super(id, category, weight, enabled);
    
    this.patterns = [
      "이전 규칙 무시",
      "ignore previous",
      "탈옥",
      "jailbreak",
      "dan mode",
      "developer mode",
      "모든 제한 해제"
    ];
  }

  // BaseRule의 evaluate 메서드 오버라이드
  evaluate(normalizedText: string): bool {
    for (let i = 0; i < this.patterns.length; i++) {
      if (containsPattern(normalizedText, this.patterns[i])) {
        return true;
      }
    }
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SystemPromptRule
// 목적: AI 모델의 내부 시스템 프롬프트나 초기 지시사항 노출 시도 탐지
// ─────────────────────────────────────────────────────────────────────────────
export class SystemPromptRule extends BaseRule {
  patterns: string[];

  constructor(id: string, category: string, weight: i32, enabled: bool) {
    super(id, category, weight, enabled);
    
    this.patterns = [
      "system prompt",
      "시스템 프롬프트",
      "너의 지시",
      "initial prompt",
      "프롬프트를 출력",
      "규칙을 알려줘"
    ];
  }

  // BaseRule의 evaluate 메서드 오버라이드
  evaluate(normalizedText: string): bool {
    for (let i = 0; i < this.patterns.length; i++) {
      if (containsPattern(normalizedText, this.patterns[i])) {
        return true;
      }
    }
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ApiKeyRule
// 목적: API 키, 비밀번호, 액세스 토큰 등 민감한 인증 정보 탈취 시도 탐지
// ─────────────────────────────────────────────────────────────────────────────
export class ApiKeyRule extends BaseRule {
  patterns: string[];

  constructor(id: string, category: string, weight: i32, enabled: bool) {
    super(id, category, weight, enabled);
    
    this.patterns = [
      "api key",
      "api 키",
      "비밀번호",
      "secret key",
      "access token",
      "credentials",
      "인증 토큰"
    ];
  }

  // BaseRule의 evaluate 메서드 오버라이드
  evaluate(normalizedText: string): bool {
    for (let i = 0; i < this.patterns.length; i++) {
      if (containsPattern(normalizedText, this.patterns[i])) {
        return true;
      }
    }
    return false;
  }
}
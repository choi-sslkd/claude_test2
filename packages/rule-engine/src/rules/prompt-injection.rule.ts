import { BaseRule } from './base.rule';
import { PromptRule } from '../types';

// ─────────────────────────────────────────────
// RULE-005: 프롬프트 인젝션 / 탈옥 시도 탐지
// ─────────────────────────────────────────────

const RULE_DATA: PromptRule = {
  id: 'RULE-005',
  name: 'Prompt Injection Attempt',
  description: 'AI 시스템 우회 또는 역할 조작 시도 탐지',
  tags: ['prompt_injection'],
  riskLevel: 'high',
  enabled: true,
  priority: 100,
  patterns: [
    'jailbreak',
    'dan mode',
    'developer mode',
    '탈옥',
    'act as',
    'pretend you are',
    'you are now',
    '너는 이제',
    'roleplay as',
    '역할극으로',
    'simulate being',
    '제한 없는 ai',
    'unrestricted mode',
  ],
  exclusions: [
    '역할극 게임 시나리오',    // 명시적 게임 컨텍스트는 제외
  ],
  reasonTemplate:
    'AI 시스템을 우회하려는 프롬프트 인젝션 시도가 감지되었습니다.',
  rewriteTemplate:
    'AI의 기본 정책을 준수하는 범위 안에서 원하는 내용을 요청하세요.',
  version: 1,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

export class PromptInjectionRule extends BaseRule {
  constructor() {
    super(RULE_DATA);
  }
}
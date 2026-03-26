import { BaseRule } from './base.rule';
import { PromptRule } from '../types';

// ─────────────────────────────────────────────
// RULE-003: 보안 요구사항 없는 기능 구현 요청 탐지
// ─────────────────────────────────────────────

const RULE_DATA: PromptRule = {
  id: 'RULE-003',
  name: 'Missing Security Requirement',
  description: '인증, 검증 없이 기능 구현을 요청하는 패턴 탐지',
  tags: ['missing_security_requirement'],
  riskLevel: 'medium',
  enabled: true,
  priority: 80,
  patterns: [
    '인증 없이',
    '인증없이',
    '검증 없이',
    '검증없이',
    '보안 없이',
    '보안없이',
    '로그인 없이',
    'without authentication',
    'without auth',
    'no auth',
    'bypass login',
    'skip validation',
    '권한 체크 없이',
  ],
  reasonTemplate: '보안 요구사항 없이 기능 구현을 요청하고 있습니다.',
  rewriteTemplate:
    '인증, 권한 검사, 입력값 검증 조건을 포함하여 기능을 요청하세요. ' +
    '예: "사용자 인증과 파일 형식 검증이 포함된 안전한 업로드 기능을 만들어줘"',
  version: 1,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

export class MissingSecurityRule extends BaseRule {
  constructor() {
    super(RULE_DATA);
  }
}
import { BaseRule } from './base.rule';
import { PromptRule } from '../types';

// ─────────────────────────────────────────────
// RULE-004: 불명확하거나 과도하게 광범위한 요청 탐지
// ─────────────────────────────────────────────

const RULE_DATA: PromptRule = {
  id: 'RULE-004',
  name: 'Ambiguous Request',
  description: '범위가 너무 넓거나 불명확한 정보 요청 탐지',
  tags: ['ambiguous_request'],
  riskLevel: 'low',
  enabled: true,
  priority: 60,
  patterns: [
    '모든 정보',
    '전부 알려줘',
    '다 보여줘',
    '전체 목록',
    '숨겨진',
    '숨긴',
    'everything about',
    'all data',
    'dump all',
    'list everything',
    '전체 데이터',
    '전부 출력',
  ],
  reasonTemplate:
    '요청이 너무 광범위하거나 불명확하여 의도치 않은 정보가 노출될 수 있습니다.',
  rewriteTemplate:
    '필요한 정보의 범위와 목적을 구체적으로 명시하여 요청하세요.',
  version: 1,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

export class AmbiguousRequestRule extends BaseRule {
  constructor() {
    super(RULE_DATA);
  }
}
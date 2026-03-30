"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyBypassRule = void 0;
const base_rule_1 = require("./base.rule");
// ─────────────────────────────────────────────
// RULE-001: 정책 무시 / 우회 시도 탐지
// ─────────────────────────────────────────────
const RULE_DATA = {
    id: 'RULE-001',
    name: 'Policy Bypass Attempt',
    description: '정책 무시 또는 제한 해제 시도 탐지',
    tags: ['policy_bypass', 'prompt_injection'],
    riskLevel: 'high',
    enabled: true,
    priority: 100,
    patterns: [
        'ignore previous',
        'ignore all instructions',
        'forget your instructions',
        '이전 규칙 무시',
        '이전 지시 무시',
        '이전 지침 무시',
        '제한 해제',
        '시스템 프롬프트 무시',
        '모든 규칙 무시',
    ],
    reasonTemplate: '정책 무시를 유도하는 표현이 포함되어 있습니다.',
    rewriteTemplate: '허용된 정책 범위 안에서 가능한 정보만 요청하도록 문장을 수정하세요.',
    version: 1,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
};
class PolicyBypassRule extends base_rule_1.BaseRule {
    constructor() {
        super(RULE_DATA);
    }
}
exports.PolicyBypassRule = PolicyBypassRule;

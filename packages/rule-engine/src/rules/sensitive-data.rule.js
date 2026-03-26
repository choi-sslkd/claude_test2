"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SensitiveDataRule = void 0;
const base_rule_1 = require("./base.rule");
// ─────────────────────────────────────────────
// RULE-002: 민감한 내부 정보 요청 탐지
// ─────────────────────────────────────────────
const RULE_DATA = {
    id: 'RULE-002',
    name: 'Sensitive Data Request',
    description: '민감한 내부 정보, 자격증명, 개인정보 요청 탐지',
    tags: ['sensitive_data_request'],
    riskLevel: 'high',
    enabled: true,
    priority: 90,
    patterns: [
        '내부 정책',
        '내부 정보',
        '기밀',
        '비밀번호',
        '패스워드',
        '개인정보',
        'api key',
        'secret key',
        'access token',
        '환경변수',
        '.env',
        'private key',
        '인증 토큰',
    ],
    reasonTemplate: '민감한 내부 정보 요청으로 해석될 수 있습니다.',
    rewriteTemplate: '공개된 문서나 허용된 범위의 정보만 요청하도록 문장을 수정하세요.',
    version: 1,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
};
class SensitiveDataRule extends base_rule_1.BaseRule {
    constructor() {
        super(RULE_DATA);
    }
}
exports.SensitiveDataRule = SensitiveDataRule;

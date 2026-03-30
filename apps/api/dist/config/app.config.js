"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
// ─────────────────────────────────────────────
// 앱 설정값 — 환경변수로 주입, 기본값 제공
// ─────────────────────────────────────────────
exports.default = (0, config_1.registerAs)('app', () => ({
    port: parseInt(process.env.PORT ?? '3000', 10),
    // 원문 프롬프트 감사 로그 저장 여부
    saveOriginalPrompt: process.env.SAVE_ORIGINAL_PROMPT !== 'false',
    // 프롬프트 최대 길이
    maxPromptLength: parseInt(process.env.MAX_PROMPT_LENGTH ?? '2000', 10),
    // 관리자 API 키 (헤더: x-admin-key)
    adminApiKey: process.env.ADMIN_API_KEY ?? 'dev-admin-key',
    // 환경
    nodeEnv: process.env.NODE_ENV ?? 'development',
}));

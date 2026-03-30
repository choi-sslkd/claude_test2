"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyzeService = void 0;
const common_1 = require("@nestjs/common");
const rule_engine_1 = require("@prompt-guard/rule-engine");
const audit_log_service_1 = require("../audit-log/audit-log.service");
// ─────────────────────────────────────────────
// 분석 서비스 — 룰 엔진 호출 + 감사 로그 기록
// ─────────────────────────────────────────────
let AnalyzeService = class AnalyzeService {
    constructor(auditLogService) {
        this.auditLogService = auditLogService;
        this.engine = new rule_engine_1.RuleEngine();
    }
    async analyze(prompt) {
        const result = this.engine.analyze(prompt);
        // 감사 로그 비동기 기록 (응답 속도에 영향 없도록)
        this.auditLogService.recordAnalyze({
            prompt,
            riskLevel: result.riskLevel,
            matchedRuleIds: result.matchedRules.map((r) => r.ruleId),
            rewriteCount: result.rewrites.length,
        });
        return result;
    }
};
exports.AnalyzeService = AnalyzeService;
exports.AnalyzeService = AnalyzeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [audit_log_service_1.AuditLogService])
], AnalyzeService);

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
exports.RulesService = void 0;
const common_1 = require("@nestjs/common");
const rule_engine_1 = require("@prompt-guard/rule-engine");
const rules_repository_1 = require("./rules.repository");
const audit_log_service_1 = require("../audit-log/audit-log.service");
let RulesService = class RulesService {
    constructor(repo, auditLogService) {
        this.repo = repo;
        this.auditLogService = auditLogService;
    }
    findAll(enabledOnly) {
        const data = this.repo.findAll(enabledOnly);
        return { data, total: data.length };
    }
    findOne(id) {
        const rule = this.repo.findById(id);
        if (!rule)
            throw new common_1.NotFoundException(`룰 ${id}을 찾을 수 없습니다.`);
        return rule;
    }
    create(dto, actor) {
        const rule = this.repo.create(dto);
        this.auditLogService.recordAdmin({
            type: 'rule_create',
            actor,
            detail: `룰 생성: ${rule.id} - ${rule.name}`,
        });
        return rule;
    }
    update(id, dto, actor) {
        const updated = this.repo.update(id, dto);
        if (!updated)
            throw new common_1.NotFoundException(`룰 ${id}을 찾을 수 없습니다.`);
        const logType = dto.enabled === false ? 'rule_disable' : 'rule_update';
        this.auditLogService.recordAdmin({
            type: logType,
            actor,
            detail: `룰 수정: ${updated.id} v${updated.version}`,
        });
        return updated;
    }
    test(dto) {
        let targetRule;
        if (dto.ruleId) {
            const found = this.repo.findById(dto.ruleId);
            if (!found)
                throw new common_1.NotFoundException(`룰 ${dto.ruleId}을 찾을 수 없습니다.`);
            targetRule = found;
        }
        else if (dto.rule) {
            // 임시 룰 구성
            const now = new Date().toISOString();
            targetRule = { ...dto.rule, id: 'TEMP', version: 0, createdAt: now, updatedAt: now };
        }
        else {
            throw new common_1.BadRequestException('ruleId 또는 rule 객체가 필요합니다.');
        }
        // 단일 룰만 포함한 임시 엔진으로 테스트
        const engine = rule_engine_1.RuleEngine.fromRuleData([targetRule]);
        const result = engine.analyze(dto.prompt);
        const matched = result.matchedRules.length > 0;
        return {
            matched,
            ...(matched && {
                riskLevel: result.riskLevel,
                tags: result.tags,
                reason: result.reasons[0],
                rewrite: result.rewrites[0],
            }),
        };
    }
};
exports.RulesService = RulesService;
exports.RulesService = RulesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [rules_repository_1.RulesRepository,
        audit_log_service_1.AuditLogService])
], RulesService);

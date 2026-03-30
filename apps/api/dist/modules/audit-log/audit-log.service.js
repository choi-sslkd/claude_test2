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
exports.AuditLogService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const uuid_1 = require("uuid");
let AuditLogService = class AuditLogService {
    constructor(config) {
        this.config = config;
        this.logs = [];
        this.saveOriginalPrompt = this.config.get('app.saveOriginalPrompt', true);
    }
    recordAnalyze(params) {
        this.logs.push({
            id: (0, uuid_1.v4)(),
            type: 'analyze',
            requestedAt: new Date().toISOString(),
            prompt: this.saveOriginalPrompt ? params.prompt : undefined,
            riskLevel: params.riskLevel,
            matchedRuleIds: params.matchedRuleIds,
            rewriteCount: params.rewriteCount,
        });
    }
    recordAdmin(params) {
        this.logs.push({
            id: (0, uuid_1.v4)(),
            type: params.type,
            requestedAt: new Date().toISOString(),
            actor: params.actor,
            detail: params.detail,
        });
    }
    findAll(options) {
        const { type, page = 1, limit = 20 } = options ?? {};
        let filtered = type
            ? this.logs.filter((l) => l.type === type)
            : [...this.logs];
        // 최신순 정렬
        filtered.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
        return {
            data: filtered.slice((page - 1) * limit, page * limit),
            total: filtered.length,
            page,
            limit,
        };
    }
};
exports.AuditLogService = AuditLogService;
exports.AuditLogService = AuditLogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AuditLogService);

"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RulesRepository = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
// ─────────────────────────────────────────────
// 인메모리 룰 저장소 (추후 DB Repository로 교체 가능)
// ─────────────────────────────────────────────
let RulesRepository = class RulesRepository {
    constructor() {
        this.store = [
        // 기본 룰은 rule-engine 패키지의 내장 룰을 참조하되
        // DB 연동 시 이 목록을 DB에서 로드하여 엔진에 주입한다.
        ];
    }
    findAll(enabledOnly) {
        return enabledOnly
            ? this.store.filter((r) => r.enabled)
            : [...this.store];
    }
    findById(id) {
        return this.store.find((r) => r.id === id);
    }
    create(dto) {
        const now = new Date().toISOString();
        const rule = {
            ...dto,
            id: `RULE-${(0, uuid_1.v4)().split('-')[0].toUpperCase()}`,
            version: 1,
            createdAt: now,
            updatedAt: now,
        };
        this.store.push(rule);
        return rule;
    }
    update(id, dto) {
        const idx = this.store.findIndex((r) => r.id === id);
        if (idx === -1)
            return null;
        this.store[idx] = {
            ...this.store[idx],
            ...dto,
            id: this.store[idx].id, // id 변경 불가
            version: this.store[idx].version + 1,
            updatedAt: new Date().toISOString(),
        };
        return this.store[idx];
    }
};
exports.RulesRepository = RulesRepository;
exports.RulesRepository = RulesRepository = __decorate([
    (0, common_1.Injectable)()
], RulesRepository);

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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RulesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const rules_service_1 = require("./rules.service");
const create_rule_dto_1 = require("./dto/create-rule.dto");
const update_rule_dto_1 = require("./dto/update-rule.dto");
const test_rule_dto_1 = require("./dto/test-rule.dto");
const admin_guard_1 = require("../../common/guards/admin.guard");
let RulesController = class RulesController {
    constructor(rulesService) {
        this.rulesService = rulesService;
    }
    findAll(enabled) {
        const enabledOnly = enabled === 'true' ? true : undefined;
        return this.rulesService.findAll(enabledOnly);
    }
    findOne(ruleId) {
        return this.rulesService.findOne(ruleId);
    }
    // 관리자 전용 엔드포인트 — AdminGuard 적용
    create(dto, actor) {
        return this.rulesService.create(dto, actor);
    }
    update(ruleId, dto, actor) {
        return this.rulesService.update(ruleId, dto, actor);
    }
    test(dto) {
        return this.rulesService.test(dto);
    }
};
exports.RulesController = RulesController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: '룰 목록 조회' }),
    __param(0, (0, common_1.Query)('enabled')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RulesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':ruleId'),
    (0, swagger_1.ApiOperation)({ summary: '룰 단건 조회' }),
    __param(0, (0, common_1.Param)('ruleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RulesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    (0, swagger_1.ApiSecurity)('x-admin-key'),
    (0, swagger_1.ApiOperation)({ summary: '룰 생성 (관리자)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-admin-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_rule_dto_1.CreateRuleDto, String]),
    __metadata("design:returntype", void 0)
], RulesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':ruleId'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    (0, swagger_1.ApiSecurity)('x-admin-key'),
    (0, swagger_1.ApiOperation)({ summary: '룰 수정 (관리자)' }),
    __param(0, (0, common_1.Param)('ruleId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-admin-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_rule_dto_1.UpdateRuleDto, String]),
    __metadata("design:returntype", void 0)
], RulesController.prototype, "update", null);
__decorate([
    (0, common_1.Post)('test'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    (0, swagger_1.ApiSecurity)('x-admin-key'),
    (0, swagger_1.ApiOperation)({ summary: '룰 테스트 (관리자)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [test_rule_dto_1.TestRuleDto]),
    __metadata("design:returntype", void 0)
], RulesController.prototype, "test", null);
exports.RulesController = RulesController = __decorate([
    (0, swagger_1.ApiTags)('Rules'),
    (0, common_1.Controller)('api/v1/rules'),
    __metadata("design:paramtypes", [rules_service_1.RulesService])
], RulesController);

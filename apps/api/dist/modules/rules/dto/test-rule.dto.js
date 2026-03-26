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
exports.TestRuleDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const create_rule_dto_1 = require("./create-rule.dto");
class TestRuleDto {
}
exports.TestRuleDto = TestRuleDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: '기존 룰 ID' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], TestRuleDto.prototype, "ruleId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: '임시 룰 객체 (ruleId 없을 때 사용)' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", create_rule_dto_1.CreateRuleDto)
], TestRuleDto.prototype, "rule", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '테스트할 프롬프트' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], TestRuleDto.prototype, "prompt", void 0);

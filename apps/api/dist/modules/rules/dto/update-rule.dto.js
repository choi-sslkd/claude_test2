"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateRuleDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_rule_dto_1 = require("./create-rule.dto");
// 모든 필드를 optional로 처리
class UpdateRuleDto extends (0, swagger_1.PartialType)(create_rule_dto_1.CreateRuleDto) {
}
exports.UpdateRuleDto = UpdateRuleDto;

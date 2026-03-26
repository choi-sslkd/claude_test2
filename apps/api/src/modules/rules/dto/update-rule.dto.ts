import { PartialType } from '@nestjs/swagger';
import { CreateRuleDto } from './create-rule.dto';

// 모든 필드를 optional로 처리
export class UpdateRuleDto extends PartialType(CreateRuleDto) {}
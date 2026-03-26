import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { RuleEngine, PromptRule } from '@prompt-guard/rule-engine';
import { RulesRepository } from './rules.repository';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { TestRuleDto } from './dto/test-rule.dto';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class RulesService {
  constructor(
    private readonly repo: RulesRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  findAll(enabledOnly?: boolean) {
    const data = this.repo.findAll(enabledOnly);
    return { data, total: data.length };
  }

  findOne(id: string) {
    const rule = this.repo.findById(id);
    if (!rule) throw new NotFoundException(`룰 ${id}을 찾을 수 없습니다.`);
    return rule;
  }

  create(dto: CreateRuleDto, actor?: string) {
    const rule = this.repo.create(dto);
    this.auditLogService.recordAdmin({
      type: 'rule_create',
      actor,
      detail: `룰 생성: ${rule.id} - ${rule.name}`,
    });
    return rule;
  }

  update(id: string, dto: UpdateRuleDto, actor?: string) {
    const updated = this.repo.update(id, dto);
    if (!updated) throw new NotFoundException(`룰 ${id}을 찾을 수 없습니다.`);

    const logType = dto.enabled === false ? 'rule_disable' : 'rule_update';
    this.auditLogService.recordAdmin({
      type: logType,
      actor,
      detail: `룰 수정: ${updated.id} v${updated.version}`,
    });
    return updated;
  }

  test(dto: TestRuleDto) {
    let targetRule: PromptRule;

    if (dto.ruleId) {
      const found = this.repo.findById(dto.ruleId);
      if (!found) throw new NotFoundException(`룰 ${dto.ruleId}을 찾을 수 없습니다.`);
      targetRule = found;
    } else if (dto.rule) {
      // 임시 룰 구성
      const now = new Date().toISOString();
      targetRule = { ...dto.rule, id: 'TEMP', version: 0, createdAt: now, updatedAt: now };
    } else {
      throw new BadRequestException('ruleId 또는 rule 객체가 필요합니다.');
    }

    // 단일 룰만 포함한 임시 엔진으로 테스트
    const engine = RuleEngine.fromRuleData([targetRule]);
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
}
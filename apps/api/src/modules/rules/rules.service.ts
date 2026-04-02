import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WeightCalculatorService } from '../weight-calculator/weight-calculator.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';

@Injectable()
export class RulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly weightCalc: WeightCalculatorService,
    private readonly auditLog: AuditLogService,
  ) {}

  async findAll() {
    return this.prisma.rule.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const rule = await this.prisma.rule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Rule not found');
    return rule;
  }

  async create(dto: CreateRuleDto) {
    const category = dto.category ?? 'CUSTOM';

    const weights = await this.weightCalc.calculate(dto.pattern, category);

    const rule = await this.prisma.rule.create({
      data: {
        pattern: dto.pattern,
        riskLevel: weights.riskLevel as any,
        enabled: dto.enabled ?? true,
        version: dto.version ?? '1.0.0',
        category: category as any,
        injectionWeight: weights.injectionWeight,
        ambiguityWeight: weights.ambiguityWeight,
        patternWeight: weights.patternWeight,
        likelihoodScore: weights.likelihoodScore,
        impactScore: weights.impactScore,
        owaspRiskScore: weights.owaspRiskScore,
        mlInjectionScore: weights.mlInjectionScore,
        mlAmbiguityScore: weights.mlAmbiguityScore,
      },
    });

    // 감사 로그
    this.auditLog.recordAdmin({
      type: 'rule_create',
      detail: `룰 생성: pattern="${dto.pattern}" category=${category} risk=${weights.riskLevel} owasp=${weights.owaspRiskScore}`,
    });

    return rule;
  }

  async update(id: string, dto: UpdateRuleDto) {
    await this.findOne(id);

    let weightData = {};
    if (dto.pattern !== undefined || dto.category !== undefined) {
      const existing = await this.findOne(id);
      const pattern = dto.pattern ?? existing.pattern;
      const category = dto.category ?? existing.category;
      const weights = await this.weightCalc.calculate(pattern, category);
      weightData = {
        riskLevel: weights.riskLevel as any,
        category: category as any,
        injectionWeight: weights.injectionWeight,
        ambiguityWeight: weights.ambiguityWeight,
        patternWeight: weights.patternWeight,
        likelihoodScore: weights.likelihoodScore,
        impactScore: weights.impactScore,
        owaspRiskScore: weights.owaspRiskScore,
        mlInjectionScore: weights.mlInjectionScore,
        mlAmbiguityScore: weights.mlAmbiguityScore,
      };
    }

    const rule = await this.prisma.rule.update({
      where: { id },
      data: {
        ...(dto.pattern !== undefined && { pattern: dto.pattern }),
        ...(dto.enabled !== undefined && { enabled: dto.enabled }),
        ...(dto.version !== undefined && { version: dto.version }),
        ...weightData,
      },
    });

    // 감사 로그
    this.auditLog.recordAdmin({
      type: 'rule_update',
      detail: `룰 수정: id=${id} ${dto.pattern ? 'pattern="' + dto.pattern + '"' : ''} ${dto.enabled !== undefined ? 'enabled=' + dto.enabled : ''}`,
    });

    return rule;
  }

  async remove(id: string) {
    const rule = await this.findOne(id);
    await this.prisma.rule.delete({ where: { id } });

    // 감사 로그
    this.auditLog.recordAdmin({
      type: 'rule_disable',
      detail: `룰 삭제: id=${id} pattern="${rule.pattern}"`,
    });

    return rule;
  }

  async recalculateWeights(id: string) {
    const rule = await this.findOne(id);
    const weights = await this.weightCalc.calculate(rule.pattern, rule.category);

    const updated = await this.prisma.rule.update({
      where: { id },
      data: {
        riskLevel: weights.riskLevel as any,
        injectionWeight: weights.injectionWeight,
        ambiguityWeight: weights.ambiguityWeight,
        patternWeight: weights.patternWeight,
        likelihoodScore: weights.likelihoodScore,
        impactScore: weights.impactScore,
        owaspRiskScore: weights.owaspRiskScore,
        mlInjectionScore: weights.mlInjectionScore,
        mlAmbiguityScore: weights.mlAmbiguityScore,
      },
    });

    // 감사 로그
    this.auditLog.recordAdmin({
      type: 'rule_update',
      detail: `가중치 재계산: id=${id} owasp=${weights.owaspRiskScore} inj=${weights.injectionWeight}`,
    });

    return updated;
  }

  async findActiveRules() {
    const rules = await this.prisma.rule.findMany({
      where: { enabled: true },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      version: this.getRulesetVersion(rules),
      rules: rules.map((rule) => ({
        id: rule.id,
        pattern: rule.pattern,
        riskLevel: rule.riskLevel,
        category: rule.category,
        injectionWeight: rule.injectionWeight,
        ambiguityWeight: rule.ambiguityWeight,
        patternWeight: rule.patternWeight,
      })),
    };
  }

  private getRulesetVersion(rules: Array<{ version: string; updatedAt: Date }>): string {
    if (rules.length === 0) return '1.0.0';
    return `${rules[0].version}-${rules[0].updatedAt.getTime()}`;
  }
}

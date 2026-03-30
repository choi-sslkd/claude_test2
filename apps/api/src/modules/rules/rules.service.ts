import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';

@Injectable()
export class RulesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.rule.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const rule = await this.prisma.rule.findUnique({
      where: { id },
    });

    if (!rule) {
      throw new NotFoundException('Rule not found');
    }

    return rule;
  }

  async create(dto: CreateRuleDto) {
    return this.prisma.rule.create({
      data: {
        pattern: dto.pattern,
        riskLevel: dto.riskLevel,
        enabled: dto.enabled,
        version: dto.version ?? '1.0.0',
      },
    });
  }

  async update(id: string, dto: UpdateRuleDto) {
    await this.findOne(id);

    return this.prisma.rule.update({
      where: { id },
      data: {
        ...(dto.pattern !== undefined && { pattern: dto.pattern }),
        ...(dto.riskLevel !== undefined && { riskLevel: dto.riskLevel }),
        ...(dto.enabled !== undefined && { enabled: dto.enabled }),
        ...(dto.version !== undefined && { version: dto.version }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.rule.delete({
      where: { id },
    });
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
      })),
    };
  }

  private getRulesetVersion(
    rules: Array<{
      version: string;
      updatedAt: Date;
    }>,
  ): string {
    if (rules.length === 0) {
      return '1.0.0';
    }

    const latestUpdatedAt = rules[0].updatedAt;
    const latestVersion = rules[0].version;

    return `${latestVersion}-${latestUpdatedAt.getTime()}`;
  }
}
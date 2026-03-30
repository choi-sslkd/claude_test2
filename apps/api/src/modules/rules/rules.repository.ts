import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PromptRule } from '@prompt-guard/rule-engine';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';

// ─────────────────────────────────────────────
// 인메모리 룰 저장소 (추후 DB Repository로 교체 가능)
// ─────────────────────────────────────────────

@Injectable()
export class RulesRepository {
  private readonly store: PromptRule[] = [
    // 기본 룰은 rule-engine 패키지의 내장 룰을 참조하되
    // DB 연동 시 이 목록을 DB에서 로드하여 엔진에 주입한다.
  ];

  findAll(enabledOnly?: boolean): PromptRule[] {
    return enabledOnly
      ? this.store.filter((r) => r.enabled)
      : [...this.store];
  }

  findById(id: string): PromptRule | undefined {
    return this.store.find((r) => r.id === id);
  }

  create(dto: CreateRuleDto): PromptRule {
    const now = new Date().toISOString();
    const rule: PromptRule = {
      ...dto,
      id: `RULE-${uuidv4().split('-')[0].toUpperCase()}`,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.store.push(rule);
    return rule;
  }

  update(id: string, dto: UpdateRuleDto): PromptRule | null {
    const idx = this.store.findIndex((r) => r.id === id);
    if (idx === -1) return null;

    this.store[idx] = {
      ...this.store[idx],
      ...dto,
      id: this.store[idx].id,           // id 변경 불가
      version: this.store[idx].version + 1,
      updatedAt: new Date().toISOString(),
    };
    return this.store[idx];
  }
}
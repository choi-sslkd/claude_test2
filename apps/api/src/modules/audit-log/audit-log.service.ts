import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { RiskLevel } from '@prompt-guard/rule-engine';

export type AuditLogType =
  | 'analyze'
  | 'rule_create'
  | 'rule_update'
  | 'rule_disable';

export interface AuditLog {
  id: string;
  type: AuditLogType;
  requestedAt: string;
  prompt?: string;           // saveOriginalPrompt 설정에 따라 저장 여부 결정
  riskLevel?: RiskLevel;
  matchedRuleIds?: string[];
  rewriteCount?: number;
  actor?: string;
  detail?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logs: AuditLog[] = [];
  private readonly saveOriginalPrompt: boolean;

  constructor(private readonly config: ConfigService) {
    this.saveOriginalPrompt = this.config.get<boolean>(
      'app.saveOriginalPrompt', true
    );
  }

  recordAnalyze(params: {
    prompt: string;
    riskLevel: RiskLevel;
    matchedRuleIds: string[];
    rewriteCount: number;
  }): void {
    this.logs.push({
      id: uuidv4(),
      type: 'analyze',
      requestedAt: new Date().toISOString(),
      prompt: this.saveOriginalPrompt ? params.prompt : undefined,
      riskLevel: params.riskLevel,
      matchedRuleIds: params.matchedRuleIds,
      rewriteCount: params.rewriteCount,
    });
  }

  recordAdmin(params: {
    type: Exclude<AuditLogType, 'analyze'>;
    actor?: string;
    detail?: string;
  }): void {
    this.logs.push({
      id: uuidv4(),
      type: params.type,
      requestedAt: new Date().toISOString(),
      actor: params.actor,
      detail: params.detail,
    });
  }

  findAll(options?: {
    type?: AuditLogType;
    page?: number;
    limit?: number;
  }): { data: AuditLog[]; total: number; page: number; limit: number } {
    const { type, page = 1, limit = 20 } = options ?? {};

    let filtered = type
      ? this.logs.filter((l) => l.type === type)
      : [...this.logs];

    // 최신순 정렬
    filtered.sort(
      (a, b) =>
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );

    return {
      data: filtered.slice((page - 1) * limit, page * limit),
      total: filtered.length,
      page,
      limit,
    };
  }
}
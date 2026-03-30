import { Injectable } from '@nestjs/common';
import { RuleEngine, AnalyzeResult } from '@prompt-guard/rule-engine';
import { AuditLogService } from '../audit-log/audit-log.service';

// ─────────────────────────────────────────────
// 분석 서비스 — 룰 엔진 호출 + 감사 로그 기록
// ─────────────────────────────────────────────

@Injectable()
export class AnalyzeService {
  private readonly engine: RuleEngine;

  constructor(private readonly auditLogService: AuditLogService) {
    this.engine = new RuleEngine();
  }

  async analyze(prompt: string): Promise<AnalyzeResult> {
    const result = this.engine.analyze(prompt);

    // 감사 로그 비동기 기록 (응답 속도에 영향 없도록)
    this.auditLogService.recordAnalyze({
      prompt,
      riskLevel: result.riskLevel,
      matchedRuleIds: result.matchedRules.map((r) => r.ruleId),
      rewriteCount: result.rewrites.length,
    });

    return result;
  }
}
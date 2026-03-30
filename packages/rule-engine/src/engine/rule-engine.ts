import { AnalyzeResult, EngineOptions, PromptRule, RuleMatch } from '../types';
import { BaseRule } from '../rules/base.rule';
import { PolicyBypassRule } from '../rules/policy-bypass.rule';
import { SensitiveDataRule } from '../rules/sensitive-data.rule';
import { MissingSecurityRule } from '../rules/missing-security.rule';
import { AmbiguousRequestRule } from '../rules/ambiguous-request.rule';
import { PromptInjectionRule } from '../rules/prompt-injection.rule';
import { RiskScorer } from '../scorers/risk.scorer';

// ─────────────────────────────────────────────
// 룰 엔진 코어
// 등록된 룰들을 순서대로 평가하고 결과를 집계한다.
// ─────────────────────────────────────────────

export class RuleEngine {
  private readonly rules: BaseRule[];

  constructor(
    customRules: BaseRule[] = [],
    private readonly options: EngineOptions = {}
  ) {
    // 기본 내장 룰 + 외부에서 주입한 커스텀 룰
    const builtinRules: BaseRule[] = [
      new PolicyBypassRule(),
      new PromptInjectionRule(),
      new SensitiveDataRule(),
      new MissingSecurityRule(),
      new AmbiguousRequestRule(),
    ];

    // priority 내림차순으로 정렬 (높은 우선순위 먼저 평가)
    this.rules = [...builtinRules, ...customRules].sort(
      (a, b) => b.priority - a.priority
    );
  }

  /**
   * 프롬프트를 분석하여 AnalyzeResult 반환
   */
  analyze(prompt: string): AnalyzeResult {
    const matches: RuleMatch[] = [];

    for (const rule of this.rules) {
      // high 탐지 즉시 중단 옵션
      if (
        this.options.stopOnFirstHigh &&
        matches.some((m) => m.riskLevel === 'high')
      ) {
        break;
      }

      const match = rule.evaluate(prompt);
      if (match) matches.push(match);

      // 최대 룰 매칭 수 제한
      if (this.options.maxRules && matches.length >= this.options.maxRules) {
        break;
      }
    }

    return this.buildResult(matches);
  }

  /**
   * 동적으로 룰을 추가 (외부에서 DB 룰을 주입할 때 사용)
   */
  static fromRuleData(ruleDataList: PromptRule[]): RuleEngine {
    const dynamicRules = ruleDataList.map((data) => {
      // 동적 룰은 BaseRule을 익명 클래스로 생성
      return new (class extends BaseRule {
        constructor() { super(data); }
      })();
    });
    return new RuleEngine(dynamicRules);
  }

  private buildResult(matches: RuleMatch[]): AnalyzeResult {
    const riskLevel = RiskScorer.score(matches);

    // 중복 태그 제거
    const tags = [...new Set(matches.flatMap((m) => m.tags))];
    const reasons = matches.map((m) => m.reason);
    const rewrites = matches
      .map((m) => m.rewrite)
      .filter((r): r is string => !!r);

    return {
      riskLevel,
      tags,
      reasons,
      rewrites,
      matchedRules: matches,
      analyzedAt: new Date().toISOString(),
    };
  }
}
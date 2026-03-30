import { PromptRule, RuleMatch } from '../types';
import { TextNormalizer } from '../normalizers/text.normalizer';
import { ReasonExplainer } from '../explainers/reason.explainer';
import { SafeRewriter } from '../rewriters/safe.rewriter';

// ─────────────────────────────────────────────
// 모든 룰의 기반 추상 클래스
// 공통 매칭 로직을 제공하며 각 룰은 이를 상속한다.
// ─────────────────────────────────────────────

export abstract class BaseRule {
  constructor(protected readonly rule: PromptRule) {}

  get id() { return this.rule.id; }
  get enabled() { return this.rule.enabled; }
  get priority() { return this.rule.priority; }
  get ruleData() { return this.rule; }

  /**
   * 프롬프트에 대해 이 룰을 평가하고 매칭 결과를 반환한다.
   * 매칭되지 않으면 null 반환.
   */
  evaluate(prompt: string): RuleMatch | null {
    if (!this.rule.enabled) return null;

    const normalized = TextNormalizer.normalize(prompt);
    const matchedPatterns = this.findMatchedPatterns(normalized);

    if (matchedPatterns.length === 0) return null;

    return {
      ruleId: this.rule.id,
      ruleName: this.rule.name,
      tags: this.rule.tags,
      riskLevel: this.rule.riskLevel,
      reason: ReasonExplainer.explain(this.rule, matchedPatterns),
      rewrite: SafeRewriter.rewrite(this.rule, prompt) ?? undefined,
      matchedPatterns,
    };
  }

  /**
   * 패턴 매칭 로직 — 기본은 단순 substring 포함 검사
   * 필요 시 하위 클래스에서 override 가능 (예: 정규식, 의미론적 매칭)
   */
  protected findMatchedPatterns(normalizedPrompt: string): string[] {
    // exclusion 패턴이 있으면 제외
    if (this.rule.exclusions?.some((ex) =>
      normalizedPrompt.includes(TextNormalizer.normalizePattern(ex))
    )) {
      return [];
    }

    return this.rule.patterns.filter((pattern) =>
      normalizedPrompt.includes(TextNormalizer.normalizePattern(pattern))
    );
  }
}
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRule = void 0;
const text_normalizer_1 = require("../normalizers/text.normalizer");
const reason_explainer_1 = require("../explainers/reason.explainer");
const safe_rewriter_1 = require("../rewriters/safe.rewriter");
// ─────────────────────────────────────────────
// 모든 룰의 기반 추상 클래스
// 공통 매칭 로직을 제공하며 각 룰은 이를 상속한다.
// ─────────────────────────────────────────────
class BaseRule {
    constructor(rule) {
        this.rule = rule;
    }
    get id() { return this.rule.id; }
    get enabled() { return this.rule.enabled; }
    get priority() { return this.rule.priority; }
    get ruleData() { return this.rule; }
    /**
     * 프롬프트에 대해 이 룰을 평가하고 매칭 결과를 반환한다.
     * 매칭되지 않으면 null 반환.
     */
    evaluate(prompt) {
        if (!this.rule.enabled)
            return null;
        const normalized = text_normalizer_1.TextNormalizer.normalize(prompt);
        const matchedPatterns = this.findMatchedPatterns(normalized);
        if (matchedPatterns.length === 0)
            return null;
        return {
            ruleId: this.rule.id,
            ruleName: this.rule.name,
            tags: this.rule.tags,
            riskLevel: this.rule.riskLevel,
            reason: reason_explainer_1.ReasonExplainer.explain(this.rule, matchedPatterns),
            rewrite: safe_rewriter_1.SafeRewriter.rewrite(this.rule, prompt) ?? undefined,
            matchedPatterns,
        };
    }
    /**
     * 패턴 매칭 로직 — 기본은 단순 substring 포함 검사
     * 필요 시 하위 클래스에서 override 가능 (예: 정규식, 의미론적 매칭)
     */
    findMatchedPatterns(normalizedPrompt) {
        // exclusion 패턴이 있으면 제외
        if (this.rule.exclusions?.some((ex) => normalizedPrompt.includes(text_normalizer_1.TextNormalizer.normalizePattern(ex)))) {
            return [];
        }
        return this.rule.patterns.filter((pattern) => normalizedPrompt.includes(text_normalizer_1.TextNormalizer.normalizePattern(pattern)));
    }
}
exports.BaseRule = BaseRule;

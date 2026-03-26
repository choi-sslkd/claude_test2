"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleEngine = void 0;
const base_rule_1 = require("../rules/base.rule");
const policy_bypass_rule_1 = require("../rules/policy-bypass.rule");
const sensitive_data_rule_1 = require("../rules/sensitive-data.rule");
const missing_security_rule_1 = require("../rules/missing-security.rule");
const ambiguous_request_rule_1 = require("../rules/ambiguous-request.rule");
const prompt_injection_rule_1 = require("../rules/prompt-injection.rule");
const risk_scorer_1 = require("../scorers/risk.scorer");
// ─────────────────────────────────────────────
// 룰 엔진 코어
// 등록된 룰들을 순서대로 평가하고 결과를 집계한다.
// ─────────────────────────────────────────────
class RuleEngine {
    constructor(customRules = [], options = {}) {
        this.options = options;
        // 기본 내장 룰 + 외부에서 주입한 커스텀 룰
        const builtinRules = [
            new policy_bypass_rule_1.PolicyBypassRule(),
            new prompt_injection_rule_1.PromptInjectionRule(),
            new sensitive_data_rule_1.SensitiveDataRule(),
            new missing_security_rule_1.MissingSecurityRule(),
            new ambiguous_request_rule_1.AmbiguousRequestRule(),
        ];
        // priority 내림차순으로 정렬 (높은 우선순위 먼저 평가)
        this.rules = [...builtinRules, ...customRules].sort((a, b) => b.priority - a.priority);
    }
    /**
     * 프롬프트를 분석하여 AnalyzeResult 반환
     */
    analyze(prompt) {
        const matches = [];
        for (const rule of this.rules) {
            // high 탐지 즉시 중단 옵션
            if (this.options.stopOnFirstHigh &&
                matches.some((m) => m.riskLevel === 'high')) {
                break;
            }
            const match = rule.evaluate(prompt);
            if (match)
                matches.push(match);
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
    static fromRuleData(ruleDataList) {
        const dynamicRules = ruleDataList.map((data) => {
            // 동적 룰은 BaseRule을 익명 클래스로 생성
            return new (class extends base_rule_1.BaseRule {
                constructor() { super(data); }
            })();
        });
        return new RuleEngine(dynamicRules);
    }
    buildResult(matches) {
        const riskLevel = risk_scorer_1.RiskScorer.score(matches);
        // 중복 태그 제거
        const tags = [...new Set(matches.flatMap((m) => m.tags))];
        const reasons = matches.map((m) => m.reason);
        const rewrites = matches
            .map((m) => m.rewrite)
            .filter((r) => !!r);
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
exports.RuleEngine = RuleEngine;

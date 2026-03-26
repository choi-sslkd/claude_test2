import { PromptRule, RuleMatch } from '../types';
export declare abstract class BaseRule {
    protected readonly rule: PromptRule;
    constructor(rule: PromptRule);
    get id(): string;
    get enabled(): boolean;
    get priority(): number;
    get ruleData(): PromptRule;
    /**
     * 프롬프트에 대해 이 룰을 평가하고 매칭 결과를 반환한다.
     * 매칭되지 않으면 null 반환.
     */
    evaluate(prompt: string): RuleMatch | null;
    /**
     * 패턴 매칭 로직 — 기본은 단순 substring 포함 검사
     * 필요 시 하위 클래스에서 override 가능 (예: 정규식, 의미론적 매칭)
     */
    protected findMatchedPatterns(normalizedPrompt: string): string[];
}

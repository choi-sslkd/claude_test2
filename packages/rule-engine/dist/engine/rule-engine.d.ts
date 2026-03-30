import { AnalyzeResult, EngineOptions, PromptRule } from '../types';
import { BaseRule } from '../rules/base.rule';
export declare class RuleEngine {
    private readonly options;
    private readonly rules;
    constructor(customRules?: BaseRule[], options?: EngineOptions);
    /**
     * 프롬프트를 분석하여 AnalyzeResult 반환
     */
    analyze(prompt: string): AnalyzeResult;
    /**
     * 동적으로 룰을 추가 (외부에서 DB 룰을 주입할 때 사용)
     */
    static fromRuleData(ruleDataList: PromptRule[]): RuleEngine;
    private buildResult;
}

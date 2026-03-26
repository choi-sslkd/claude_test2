import { PromptRule } from '../types';
export declare class ReasonExplainer {
    /**
     * reasonTemplate에서 실제 설명 문구를 반환
     * 나중에 {{matchedPattern}} 같은 플레이스홀더 치환으로 확장 가능
     */
    static explain(rule: PromptRule, matchedPatterns: string[]): string;
}

import { PromptRule } from '../types';
export declare class SafeRewriter {
    /**
     * 룰의 rewriteTemplate을 기반으로 수정안 반환
     * template이 없으면 null 반환
     */
    static rewrite(rule: PromptRule, _originalPrompt: string): string | null;
}

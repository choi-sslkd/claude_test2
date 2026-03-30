"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafeRewriter = void 0;
// ─────────────────────────────────────────────
// 위험한 프롬프트를 안전한 형태로 재작성한다.
// 현재는 템플릿 기반, 추후 LLM 연동으로 확장 가능.
// ─────────────────────────────────────────────
class SafeRewriter {
    /**
     * 룰의 rewriteTemplate을 기반으로 수정안 반환
     * template이 없으면 null 반환
     */
    static rewrite(rule, _originalPrompt) {
        if (!rule.rewriteTemplate)
            return null;
        return rule.rewriteTemplate;
    }
}
exports.SafeRewriter = SafeRewriter;

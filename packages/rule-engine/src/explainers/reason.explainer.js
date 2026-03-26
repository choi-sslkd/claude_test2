"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReasonExplainer = void 0;
// ─────────────────────────────────────────────
// 룰 템플릿을 기반으로 사용자 친화적인 설명을 생성한다.
// 향후 프롬프트 컨텍스트를 활용한 동적 설명으로 확장 가능.
// ─────────────────────────────────────────────
class ReasonExplainer {
    /**
     * reasonTemplate에서 실제 설명 문구를 반환
     * 나중에 {{matchedPattern}} 같은 플레이스홀더 치환으로 확장 가능
     */
    static explain(rule, matchedPatterns) {
        let reason = rule.reasonTemplate;
        // 플레이스홀더 치환 (예: "{{pattern}}" → 실제 매칭 패턴)
        if (matchedPatterns.length > 0) {
            reason = reason.replace('{{pattern}}', `"${matchedPatterns[0]}"`);
        }
        return reason;
    }
}
exports.ReasonExplainer = ReasonExplainer;

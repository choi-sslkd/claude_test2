export declare class TextNormalizer {
    /**
     * 소문자 변환 + 연속 공백 제거 + 특수문자 정규화
     */
    static normalize(text: string): string;
    /**
     * 패턴도 동일하게 정규화하여 비교 일관성 확보
     */
    static normalizePattern(pattern: string): string;
}

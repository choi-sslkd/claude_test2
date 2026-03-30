// ─────────────────────────────────────────────
// 입력 텍스트 정규화
// 패턴 매칭 전 텍스트를 일관된 형태로 변환한다.
// ─────────────────────────────────────────────

export class TextNormalizer {
  /**
   * 소문자 변환 + 연속 공백 제거 + 특수문자 정규화
   */
  static normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')          // 연속 공백 → 단일 공백
      .replace(/["""]/g, '"')        // 유니코드 따옴표 통일
      .replace(/[''']/g, "'")        // 유니코드 작은따옴표 통일
      .trim();
  }

  /**
   * 패턴도 동일하게 정규화하여 비교 일관성 확보
   */
  static normalizePattern(pattern: string): string {
    return pattern.toLowerCase().trim();
  }
}
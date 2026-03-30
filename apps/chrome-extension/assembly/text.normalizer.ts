// 텍스트 전처리 모듈 (AssemblyScript)
// 규칙 매칭 전에 텍스트를 정규화하여 대소문자, 공백 차이로 인한 누락을 방지한다.

/**
 * normalizeText
 * 입력 텍스트를 소문자로 변환하고, 앞뒤 공백을 제거하며,
 * 연속된 공백을 단일 공백으로 줄인다.
 * 이유: 규칙 패턴은 소문자 기준으로 작성되므로,
 *       대소문자 혼용 입력도 동일하게 매칭되어야 한다.
 *       또한 공백이 여러 개일 경우 패턴 탐지가 실패할 수 있으므로 정규화가 필수다.
 */
export function normalizeText(text: string): string {
  // 1단계: 소문자 변환 — 대소문자 무관 매칭을 위해 반드시 필요하다.
  let lower = text.toLowerCase();

  // 2단계: 앞뒤 공백 제거 — 불필요한 선행/후행 공백이 패턴 탐지를 방해하지 않도록 한다.
  let trimmed = lower.trim();

  // 3단계: 연속 공백을 단일 공백으로 축약 — 단어 사이 공백이 불규칙하면 패턴 매칭이 어긋난다.
  let result = "";
  let prevWasSpace = false;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed.charAt(i);
    // 공백 문자(스페이스, 탭, 줄바꿈 등) 처리
    if (ch == " " || ch == "\t" || ch == "\n" || ch == "\r") {
      // 이전 문자가 공백이 아닐 때만 단일 공백을 추가한다.
      if (!prevWasSpace) {
        result += " ";
        prevWasSpace = true;
      }
      // 이전 문자도 공백이면 건너뛴다 (연속 공백 제거).
    } else {
      // 일반 문자는 그대로 결과에 추가한다.
      result += ch;
      prevWasSpace = false;
    }
  }

  return result;
}

/**
 * containsPattern
 * 정규화된 텍스트 안에 특정 패턴 문자열이 포함되어 있는지 확인한다.
 * 이유: AssemblyScript 환경에서 String.includes()가 항상 안정적으로
 *       동작한다고 보장되지 않으므로, indexOf를 이용한 명시적 검사를 사용한다.
 *       반환값이 -1이 아니면 패턴이 존재하는 것으로 판단한다.
 */
export function containsPattern(normalized: string, pattern: string): bool {
  // 패턴이 비어 있으면 항상 true — 빈 패턴은 모든 문자열에 포함된다고 간주한다.
  if (pattern.length == 0) return true;

  // 정규화된 텍스트가 비어 있으면 패턴을 포함할 수 없다.
  if (normalized.length == 0) return false;

  // indexOf를 사용하여 패턴의 시작 위치를 탐색한다.
  // -1이 아닌 값이 반환되면 패턴이 텍스트 내에 존재한다는 의미다.
  return normalized.indexOf(pattern) != -1;
}

/**
 * removeSpecialChars
 * 알파벳, 숫자, 한글, 공백을 제외한 특수문자를 제거한다.
 * 이유: 사용자가 특수문자를 삽입하여 필터를 우회하려는 시도를 차단하기 위해,
 *       규칙 매칭 전에 특수문자를 제거하는 전처리가 필요하다.
 *       예: "h@ck" → "hck", "pr0mpt" → "pr0mpt" (숫자는 유지)
 */
export function removeSpecialChars(text: string): string {
  let result = "";

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);

    // 공백(32)
    if (code == 32) {
      result += " ";
      continue;
    }

    // 숫자 0–9 (48–57)
    if (code >= 48 && code <= 57) {
      result += text.charAt(i);
      continue;
    }

    // 대문자 A–Z (65–90)
    if (code >= 65 && code <= 90) {
      result += text.charAt(i);
      continue;
    }

    // 소문자 a–z (97–122)
    if (code >= 97 && code <= 122) {
      result += text.charAt(i);
      continue;
    }

    // 한글 가–힣 (44032–55203)
    if (code >= 44032 && code <= 55203) {
      result += text.charAt(i);
      continue;
    }

    // 한글 자모 (12593–12643)
    if (code >= 12593 && code <= 12643) {
      result += text.charAt(i);
      continue;
    }

    // 그 외 문자(특수문자, 이모지 등)는 제거 — 우회 시도 차단 목적.
  }

  return result;
}

/**
 * fullNormalize
 * normalizeText + removeSpecialChars 를 순서대로 적용하는 통합 함수.
 * 이유: 파이프라인 형태로 전처리 단계를 묶어 호출 측 코드를 단순화한다.
 *       호출 순서: 소문자화/공백정규화 → 특수문자 제거.
 *       특수문자 제거를 먼저 하면 공백 패턴이 달라질 수 있으므로 순서가 중요하다.
 */
export function fullNormalize(text: string): string {
  // 1차: 소문자 변환 및 공백 정규화
  const step1 = normalizeText(text);

  // 2차: 특수문자 제거
  const step2 = removeSpecialChars(step1);

  // 최종 정규화된 문자열 반환
  return step2;
}
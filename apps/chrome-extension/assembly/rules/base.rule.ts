// assembly/rules/base.rule.ts
// 모든 룰의 공통 추상 템플릿
// AssemblyScript는 interface를 지원하지 않으므로 class 상속 방식으로 구현

/**
 * BaseRule
 * --------
 * 모든 탐지 룰이 상속받는 기본 클래스.
 * 하위 클래스는 evaluate() 메서드를 반드시 오버라이드해야 한다.
 */
export class BaseRule {
  /** 룰 고유 식별자 (예: "rule_001") */
  id: string;

  /** 룰 분류 카테고리 (예: "injection", "jailbreak", "sensitive") */
  category: string;

  /**
   * 룰 가중치 (1 ~ 100)
   * 점수 집계 시 위험도 계산에 사용된다.
   * 값이 높을수록 더 위험한 패턴으로 판단한다.
   */
  weight: i32;

  /** 룰 활성화 여부 — false 이면 평가 단계에서 건너뜀 */
  enabled: bool;

  /**
   * 생성자
   * @param id       룰 고유 식별자
   * @param category 분류 카테고리
   * @param weight   가중치 (1∼100)
   * @param enabled  활성화 여부
   */
  constructor(id: string, category: string, weight: i32, enabled: bool) {
    this.id = id;
    this.category = category;
    this.weight = weight;
    this.enabled = enabled;
  }

  /**
   * 패턴 매칭 평가 메서드
   * ----------------------
   * 기본 구현은 항상 false를 반환한다.
   * 하위 클래스에서 실제 탐지 로직으로 반드시 오버라이드해야 한다.
   *
   * @param normalizedText 정규화가 완료된 입력 텍스트
   * @returns 탐지 여부 (true = 위협 감지됨)
   */
  evaluate(normalizedText: string): bool {
    // 기본 클래스는 탐지 로직이 없으므로 false 반환
    // 하위 클래스에서 구체적인 패턴 검사 로직을 구현할 것
    return false;
  }

  /**
   * 룰 활성화 여부 확인
   * -------------------
   * 평가 파이프라인에서 이 메서드를 먼저 호출하여
   * 비활성화된 룰은 evaluate() 호출을 건너뛴다.
   *
   * @returns 활성화 상태이면 true
   */
  isActive(): bool {
    return this.enabled;
  }

  /**
   * 룰 활성화
   * ---------
   * 런타임 중 동적으로 룰을 켤 때 사용한다.
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * 룰 비활성화
   * -----------
   * 런타임 중 동적으로 룰을 끌 때 사용한다.
   * 비활성화된 룰은 평가 파이프라인에서 완전히 무시된다.
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * 룰 메타 정보를 문자열로 직렬화
   * --------------------------------
   * 디버깅 및 로깅 목적으로 룰의 현재 상태를 출력한다.
   *
   * @returns "[id=rule_001 | category=injection | weight=80 | enabled=true]" 형식의 문자열
   */
  toString(): string {
    const activeStr: string = this.enabled ? "true" : "false";
    return (
      "[id=" +
      this.id +
      " | category=" +
      this.category +
      " | weight=" +
      this.weight.toString() +
      " | enabled=" +
      activeStr +
      "]"
    );
  }
}

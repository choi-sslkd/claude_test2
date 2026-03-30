import { BaseRule } from "./base.rule";
import { containsPattern } from "../text.normalizer";

export class BypassRule extends BaseRule {
  patterns: string[];

  constructor(id: string, category: string, weight: i32, enabled: bool) {
    super(id, category, weight, enabled);
    this.patterns = ["우회", "bypass", "돌아서", "우회하는 방법"];
  }

  evaluate(input: string): bool {
    for (let i = 0; i < this.patterns.length; i++) {
      if (containsPattern(input, this.patterns[i])) return true;
    }
    return false;
  }
}

export class NoAuthRule extends BaseRule {
  patterns: string[];

  constructor(id: string, category: string, weight: i32, enabled: bool) {
    super(id, category, weight, enabled);
    this.patterns = ["인증 없이", "without auth", "인증 우회", "로그인 없이"];
  }

  evaluate(input: string): bool {
    for (let i = 0; i < this.patterns.length; i++) {
      if (containsPattern(input, this.patterns[i])) return true;
    }
    return false;
  }
}

export class PermissionRule extends BaseRule {
  patterns: string[];

  constructor(id: string, category: string, weight: i32, enabled: bool) {
    super(id, category, weight, enabled);
    this.patterns = ["권한", "permission", "관리자 권한", "루트 권한", "admin"];
  }

  evaluate(input: string): bool {
    for (let i = 0; i < this.patterns.length; i++) {
      if (containsPattern(input, this.patterns[i])) return true;
    }
    return false;
  }
}

export class RoleplayRule extends BaseRule {
  patterns: string[];

  constructor(id: string, category: string, weight: i32, enabled: bool) {
    super(id, category, weight, enabled);
    this.patterns = ["역할극", "roleplay", "~인 척", "가정해", "척해줘", "assume you are"];
  }

  evaluate(input: string): bool {
    for (let i = 0; i < this.patterns.length; i++) {
      if (containsPattern(input, this.patterns[i])) return true;
    }
    return false;
  }
}

export class HypotheticalRule extends BaseRule {
  patterns: string[];

  constructor(id: string, category: string, weight: i32, enabled: bool) {
    super(id, category, weight, enabled);
    this.patterns = ["가상의", "hypothetically", "만약에", "시나리오", "이론적으로"];
  }

  evaluate(input: string): bool {
    for (let i = 0; i < this.patterns.length; i++) {
      if (containsPattern(input, this.patterns[i])) return true;
    }
    return false;
  }
}
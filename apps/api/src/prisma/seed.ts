import { PrismaClient, RiskLevel, OwaspCategory } from "@prisma/client";

const prisma = new PrismaClient();

// OWASP 카테고리별 기본 Likelihood/Impact 점수
const OWASP_FACTORS: Record<string, { likelihood: number; impact: number }> = {
  PROMPT_INJECTION:          { likelihood: 7.75, impact: 7.25 },
  SYSTEM_PROMPT_EXTRACTION:  { likelihood: 6.5,  impact: 6.75 },
  JAILBREAK:                 { likelihood: 6.75, impact: 7.5  },
  DATA_EXFILTRATION:         { likelihood: 6.0,  impact: 7.5  },
  AMBIGUOUS_REQUEST:         { likelihood: 5.75, impact: 3.25 },
  POLICY_BYPASS:             { likelihood: 6.0,  impact: 6.5  },
  SENSITIVE_DATA:            { likelihood: 5.0,  impact: 6.5  },
  CUSTOM:                    { likelihood: 5.0,  impact: 5.0  },
};

function calcWeights(category: string, mlInj: number, mlAmb: number) {
  const f = OWASP_FACTORS[category] || OWASP_FACTORS.CUSTOM;
  const owaspRisk = (f.likelihood * f.impact) / 81;

  const injectionWeight = owaspRisk * (0.5 + 0.5 * mlInj);
  const ambiguityWeight = owaspRisk * (0.5 + 0.5 * mlAmb);
  const patternWeight = 0.1 + 0.4 * owaspRisk;

  let riskLevel: RiskLevel;
  if (owaspRisk >= 0.75) riskLevel = RiskLevel.CRITICAL;
  else if (owaspRisk >= 0.55) riskLevel = RiskLevel.HIGH;
  else if (owaspRisk >= 0.35) riskLevel = RiskLevel.MEDIUM;
  else if (owaspRisk >= 0.15) riskLevel = RiskLevel.LOW;
  else riskLevel = RiskLevel.NOTE;

  return {
    riskLevel,
    injectionWeight: Math.round(injectionWeight * 10000) / 10000,
    ambiguityWeight: Math.round(ambiguityWeight * 10000) / 10000,
    patternWeight: Math.round(patternWeight * 10000) / 10000,
    likelihoodScore: f.likelihood,
    impactScore: f.impact,
    owaspRiskScore: Math.round(owaspRisk * 10000) / 10000,
    mlInjectionScore: mlInj,
    mlAmbiguityScore: mlAmb,
  };
}

const SEED_RULES = [
  // ─── 프롬프트 인젝션 ───
  { pattern: "ignore.*previous.*instructions",  category: OwaspCategory.PROMPT_INJECTION,         mlInj: 0.95, mlAmb: 0.40 },
  { pattern: "ignore.*all.*rules",              category: OwaspCategory.PROMPT_INJECTION,         mlInj: 0.95, mlAmb: 0.35 },
  { pattern: "disregard.*previous",             category: OwaspCategory.PROMPT_INJECTION,         mlInj: 0.90, mlAmb: 0.35 },
  { pattern: "override.*instructions",          category: OwaspCategory.PROMPT_INJECTION,         mlInj: 0.90, mlAmb: 0.30 },
  { pattern: "new\\s*instructions?\\s*:",       category: OwaspCategory.PROMPT_INJECTION,         mlInj: 0.85, mlAmb: 0.30 },

  // ─── 시스템 프롬프트 추출 ───
  { pattern: "reveal.*system.*prompt",          category: OwaspCategory.SYSTEM_PROMPT_EXTRACTION, mlInj: 0.90, mlAmb: 0.30 },
  { pattern: "show.*system.*instructions",      category: OwaspCategory.SYSTEM_PROMPT_EXTRACTION, mlInj: 0.90, mlAmb: 0.30 },
  { pattern: "repeat.*your.*instructions",      category: OwaspCategory.SYSTEM_PROMPT_EXTRACTION, mlInj: 0.85, mlAmb: 0.35 },
  { pattern: "what.*your.*system.*prompt",      category: OwaspCategory.SYSTEM_PROMPT_EXTRACTION, mlInj: 0.85, mlAmb: 0.35 },

  // ─── 탈옥 (Jailbreak) ───
  { pattern: "you.*are.*now.*DAN",              category: OwaspCategory.JAILBREAK,                mlInj: 0.95, mlAmb: 0.25 },
  { pattern: "do.*anything.*now",               category: OwaspCategory.JAILBREAK,                mlInj: 0.90, mlAmb: 0.30 },
  { pattern: "ignore.*safety.*guidelines",      category: OwaspCategory.JAILBREAK,                mlInj: 0.90, mlAmb: 0.25 },
  { pattern: "bypass.*content.*filter",         category: OwaspCategory.JAILBREAK,                mlInj: 0.85, mlAmb: 0.25 },
  { pattern: "no\\s*restrictions",              category: OwaspCategory.JAILBREAK,                mlInj: 0.85, mlAmb: 0.30 },
  { pattern: "jailbreak",                       category: OwaspCategory.JAILBREAK,                mlInj: 0.90, mlAmb: 0.20 },
  { pattern: "dan\\s*mode",                     category: OwaspCategory.JAILBREAK,                mlInj: 0.90, mlAmb: 0.20 },

  // ─── 데이터 유출 ───
  { pattern: "api.*key",                        category: OwaspCategory.DATA_EXFILTRATION,        mlInj: 0.80, mlAmb: 0.25 },
  { pattern: "secret.*key",                     category: OwaspCategory.DATA_EXFILTRATION,        mlInj: 0.80, mlAmb: 0.25 },
  { pattern: "password.*is",                    category: OwaspCategory.DATA_EXFILTRATION,        mlInj: 0.75, mlAmb: 0.30 },
  { pattern: "database.*credential",            category: OwaspCategory.DATA_EXFILTRATION,        mlInj: 0.80, mlAmb: 0.20 },
  { pattern: "\\.env.*file",                    category: OwaspCategory.DATA_EXFILTRATION,        mlInj: 0.75, mlAmb: 0.20 },
  { pattern: "access.*token",                   category: OwaspCategory.DATA_EXFILTRATION,        mlInj: 0.80, mlAmb: 0.25 },

  // ─── 정책 우회 ───
  { pattern: "pretend.*you.*have.*no.*rules",   category: OwaspCategory.POLICY_BYPASS,            mlInj: 0.85, mlAmb: 0.30 },
  { pattern: "act.*as.*if.*no.*restrictions",   category: OwaspCategory.POLICY_BYPASS,            mlInj: 0.85, mlAmb: 0.30 },
  { pattern: "developer.*mode",                 category: OwaspCategory.POLICY_BYPASS,            mlInj: 0.80, mlAmb: 0.30 },

  // ─── 한국어: 인젝션 ───
  { pattern: "이전.*규칙.*무시",                  category: OwaspCategory.PROMPT_INJECTION,         mlInj: 0.90, mlAmb: 0.40 },
  { pattern: "이전.*지시.*무시",                  category: OwaspCategory.PROMPT_INJECTION,         mlInj: 0.90, mlAmb: 0.35 },
  { pattern: "이전.*명령.*무시",                  category: OwaspCategory.PROMPT_INJECTION,         mlInj: 0.90, mlAmb: 0.35 },
  { pattern: "모든.*지시.*잊어",                  category: OwaspCategory.PROMPT_INJECTION,         mlInj: 0.85, mlAmb: 0.35 },
  { pattern: "위.*지시.*무시",                    category: OwaspCategory.PROMPT_INJECTION,         mlInj: 0.85, mlAmb: 0.35 },
  { pattern: "규칙.*무시.*대답",                  category: OwaspCategory.PROMPT_INJECTION,         mlInj: 0.85, mlAmb: 0.30 },

  // ─── 한국어: 시스템 프롬프트 추출 ───
  { pattern: "시스템.*프롬프트.*보여",            category: OwaspCategory.SYSTEM_PROMPT_EXTRACTION, mlInj: 0.85, mlAmb: 0.35 },
  { pattern: "시스템.*프롬프트.*알려",            category: OwaspCategory.SYSTEM_PROMPT_EXTRACTION, mlInj: 0.85, mlAmb: 0.35 },
  { pattern: "원래.*프롬프트.*알려",              category: OwaspCategory.SYSTEM_PROMPT_EXTRACTION, mlInj: 0.85, mlAmb: 0.35 },
  { pattern: "내부.*지시.*출력",                  category: OwaspCategory.SYSTEM_PROMPT_EXTRACTION, mlInj: 0.80, mlAmb: 0.30 },
  { pattern: "숨겨진.*프롬프트",                  category: OwaspCategory.SYSTEM_PROMPT_EXTRACTION, mlInj: 0.80, mlAmb: 0.30 },
  { pattern: "초기.*설정.*보여",                  category: OwaspCategory.SYSTEM_PROMPT_EXTRACTION, mlInj: 0.80, mlAmb: 0.30 },

  // ─── 한국어: 탈옥 ───
  { pattern: "탈옥",                             category: OwaspCategory.JAILBREAK,                mlInj: 0.85, mlAmb: 0.25 },
  { pattern: "제한.*없.*모드",                   category: OwaspCategory.JAILBREAK,                mlInj: 0.85, mlAmb: 0.25 },
  { pattern: "안전.*장치.*해제",                  category: OwaspCategory.JAILBREAK,                mlInj: 0.85, mlAmb: 0.25 },
  { pattern: "필터.*끄",                         category: OwaspCategory.JAILBREAK,                mlInj: 0.80, mlAmb: 0.25 },
  { pattern: "검열.*없이",                       category: OwaspCategory.JAILBREAK,                mlInj: 0.80, mlAmb: 0.25 },
  { pattern: "제한.*풀어",                       category: OwaspCategory.JAILBREAK,                mlInj: 0.80, mlAmb: 0.25 },
  { pattern: "제한.*해제",                       category: OwaspCategory.JAILBREAK,                mlInj: 0.80, mlAmb: 0.25 },

  // ─── 한국어: 역할 변경 ───
  { pattern: "너는.*이제",                       category: OwaspCategory.POLICY_BYPASS,            mlInj: 0.75, mlAmb: 0.35 },
  { pattern: "역할.*바꿔",                       category: OwaspCategory.POLICY_BYPASS,            mlInj: 0.75, mlAmb: 0.35 },
  { pattern: "다른.*AI.*척",                     category: OwaspCategory.POLICY_BYPASS,            mlInj: 0.75, mlAmb: 0.30 },

  // ─── 한국어: 데이터 유출 ───
  { pattern: "api.*키.*알려",                    category: OwaspCategory.DATA_EXFILTRATION,        mlInj: 0.80, mlAmb: 0.30 },
  { pattern: "비밀번호.*알려",                    category: OwaspCategory.DATA_EXFILTRATION,        mlInj: 0.75, mlAmb: 0.30 },
  { pattern: "서버.*설정.*보여",                  category: OwaspCategory.DATA_EXFILTRATION,        mlInj: 0.75, mlAmb: 0.25 },
  { pattern: "환경.*변수.*알려",                  category: OwaspCategory.DATA_EXFILTRATION,        mlInj: 0.75, mlAmb: 0.25 },
  { pattern: "인증.*토큰.*보여",                  category: OwaspCategory.DATA_EXFILTRATION,        mlInj: 0.80, mlAmb: 0.25 },

  // ─── 한국어: 우회 기법 ───
  { pattern: "교육.*목적.*프롬프트",              category: OwaspCategory.POLICY_BYPASS,            mlInj: 0.70, mlAmb: 0.30 },
  { pattern: "디버그.*모드",                     category: OwaspCategory.POLICY_BYPASS,            mlInj: 0.75, mlAmb: 0.25 },
  { pattern: "개발자.*모드",                     category: OwaspCategory.POLICY_BYPASS,            mlInj: 0.75, mlAmb: 0.25 },
  { pattern: "관리자.*권한",                     category: OwaspCategory.POLICY_BYPASS,            mlInj: 0.80, mlAmb: 0.25 },
];

async function main() {
  let created = 0;
  let skipped = 0;

  for (const rule of SEED_RULES) {
    const exists = await prisma.rule.findFirst({
      where: { pattern: rule.pattern },
    });

    if (exists) {
      skipped++;
      continue;
    }

    const weights = calcWeights(rule.category, rule.mlInj, rule.mlAmb);

    await prisma.rule.create({
      data: {
        pattern: rule.pattern,
        category: rule.category,
        enabled: true,
        ...weights,
      },
    });
    created++;
  }

  console.log(`Seed completed: ${created} created, ${skipped} skipped (already exist)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

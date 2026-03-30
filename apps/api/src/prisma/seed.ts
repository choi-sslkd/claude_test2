import { PrismaClient, RiskLevel } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rules = [
    { pattern: "jailbreak", riskLevel: RiskLevel.HIGH, enabled: true },
    { pattern: "dan mode", riskLevel: RiskLevel.HIGH, enabled: true },
    { pattern: "developer mode", riskLevel: RiskLevel.MEDIUM, enabled: true },
    { pattern: "act as", riskLevel: RiskLevel.MEDIUM, enabled: true },
    { pattern: "pretend you are", riskLevel: RiskLevel.MEDIUM, enabled: true },
    { pattern: "you are now", riskLevel: RiskLevel.MEDIUM, enabled: true },
    { pattern: "roleplay as", riskLevel: RiskLevel.MEDIUM, enabled: true },
    { pattern: "탈옥", riskLevel: RiskLevel.HIGH, enabled: true },
    { pattern: "너는 이제", riskLevel: RiskLevel.MEDIUM, enabled: true },
    { pattern: "제한 없는 ai", riskLevel: RiskLevel.HIGH, enabled: true },
  ];

  for (const rule of rules) {
    const exists = await prisma.rule.findFirst({
      where: { pattern: rule.pattern },
    });

    if (!exists) {
      await prisma.rule.create({ data: rule });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed completed");
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

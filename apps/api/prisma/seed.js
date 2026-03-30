"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const rules = [
        { pattern: "jailbreak", riskLevel: client_1.RiskLevel.HIGH, enabled: true },
        { pattern: "dan mode", riskLevel: client_1.RiskLevel.HIGH, enabled: true },
        { pattern: "developer mode", riskLevel: client_1.RiskLevel.MEDIUM, enabled: true },
        { pattern: "act as", riskLevel: client_1.RiskLevel.MEDIUM, enabled: true },
        { pattern: "pretend you are", riskLevel: client_1.RiskLevel.MEDIUM, enabled: true },
        { pattern: "you are now", riskLevel: client_1.RiskLevel.MEDIUM, enabled: true },
        { pattern: "roleplay as", riskLevel: client_1.RiskLevel.MEDIUM, enabled: true },
        { pattern: "탈옥", riskLevel: client_1.RiskLevel.HIGH, enabled: true },
        { pattern: "너는 이제", riskLevel: client_1.RiskLevel.MEDIUM, enabled: true },
        { pattern: "제한 없는 ai", riskLevel: client_1.RiskLevel.HIGH, enabled: true },
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

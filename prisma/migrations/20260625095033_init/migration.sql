-- CreateEnum
CREATE TYPE "Verdict" AS ENUM ('INVEST', 'PASS', 'NEUTRAL');

-- CreateTable
CREATE TABLE "ResearchRun" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "company" TEXT NOT NULL,
    "verdict" "Verdict" NOT NULL,
    "investScore" INTEGER NOT NULL,
    "confidenceScore" INTEGER NOT NULL,
    "finalReasoning" TEXT NOT NULL,
    "keyStrengths" TEXT[],
    "keyRisks" TEXT[],
    "researchData" JSONB NOT NULL,
    "messages" JSONB NOT NULL,
    "tokensUsed" INTEGER NOT NULL,

    CONSTRAINT "ResearchRun_pkey" PRIMARY KEY ("id")
);

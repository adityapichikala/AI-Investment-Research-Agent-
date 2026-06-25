import { BaseMessage } from "@langchain/core/messages";

export interface AgentState {
  company: string;
  messages: BaseMessage[];
  researchData: {
    businessOverview: string;
    financialHealth: string;
    competitivePosition: string;
    recentNews: string;
    managementRisks: string;
    growthProspects: string;
  };
  verdict: 'INVEST' | 'PASS' | 'NEUTRAL' | null;
  confidenceScore: number; // 0–100
  investScore: number;     // 0–100 (higher = stronger buy)
  keyStrengths: string[];
  keyRisks: string[];
  finalReasoning: string;
  tokensUsed: number;
}

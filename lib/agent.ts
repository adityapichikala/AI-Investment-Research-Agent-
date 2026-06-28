import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { analysisPromptTemplate } from "./prompts";
import { researchTools } from "./tools";
import { z } from "zod";

// State Annotation for LangGraph
export const GraphState = Annotation.Root({
  company: Annotation<string>(),
  messages: Annotation<any[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  researchData: Annotation<{
    businessOverview: string;
    financialHealth: string;
    competitivePosition: string;
    recentNews: string;
    managementRisks: string;
    growthProspects: string;
  }>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({
      businessOverview: "",
      financialHealth: "",
      competitivePosition: "",
      recentNews: "",
      managementRisks: "",
      growthProspects: "",
    }),
  }),
  verdict: Annotation<'INVEST' | 'PASS' | 'NEUTRAL' | null>(),
  confidenceScore: Annotation<number>(),
  investScore: Annotation<number>(),
  keyStrengths: Annotation<string[]>(),
  keyRisks: Annotation<string[]>(),
  finalReasoning: Annotation<string>(),
  tokensUsed: Annotation<number>(),
});

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0,
  apiKey: process.env.GOOGLE_API_KEY,
});

async function researchNode(state: typeof GraphState.State) {
  const { company } = state;
  
  // Run all 5 tools in sequence
  const businessOverview = await researchTools[0].invoke({ company });
  const financialHealth = await researchTools[1].invoke({ company });
  const competitivePosition = await researchTools[2].invoke({ company });
  const recentNews = await researchTools[3].invoke({ company });
  const growthProspects = await researchTools[4].invoke({ company });

  return {
    researchData: {
      businessOverview,
      financialHealth,
      competitivePosition,
      recentNews,
      growthProspects,
      managementRisks: "", // Included in competitive/news analysis
    }
  };
}

async function analysisNode(state: typeof GraphState.State) {
  const { company, researchData } = state;
  
  const prompt = analysisPromptTemplate
    .replace("{company}", company)
    .replace("{businessOverview}", researchData.businessOverview)
    .replace("{financialHealth}", researchData.financialHealth)
    .replace("{competitivePosition}", researchData.competitivePosition)
    .replace("{recentNews}", researchData.recentNews)
    .replace("{growthProspects}", researchData.growthProspects);

  // Structured output schema matching the prompt instructions
  const investmentVerdictSchema = z.object({
    verdict: z.enum(["INVEST", "PASS", "NEUTRAL"]),
    investScore: z.number().describe("0-100 score, higher = stronger buy"),
    confidenceScore: z.number().describe("0-100 score, how confident you are"),
    keyStrengths: z.array(z.string()),
    keyRisks: z.array(z.string()),
    finalReasoning: z.string().describe("3-4 paragraph investment thesis"),
  });

  const structuredLlm = llm.withStructuredOutput(investmentVerdictSchema);

  const response = await structuredLlm.invoke([
    new SystemMessage("You are an expert financial analyst."),
    new HumanMessage(prompt)
  ]) as any;

  return {
    verdict: response.verdict,
    investScore: response.investScore,
    confidenceScore: response.confidenceScore,
    keyStrengths: response.keyStrengths,
    keyRisks: response.keyRisks,
    finalReasoning: response.finalReasoning,
  };
}

async function scoringNode(state: typeof GraphState.State) {
  // We can finalize anything related to scoring here
  // Right now, analysisNode extracts all data from LLM structured output.
  return {};
}

// Build the sequential pipeline
const workflow = new StateGraph(GraphState)
  .addNode("research_node", researchNode)
  .addNode("analysis_node", analysisNode)
  .addNode("scoring_node", scoringNode)
  .addEdge(START, "research_node")
  .addEdge("research_node", "analysis_node")
  .addEdge("analysis_node", "scoring_node")
  .addEdge("scoring_node", END);

export const agent = workflow.compile();

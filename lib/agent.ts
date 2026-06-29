import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage, BaseMessage } from "@langchain/core/messages";
import { analysisPromptTemplate } from "./prompts";
import { researchTools } from "./tools";
import { z } from "zod";

// State Annotation for LangGraph
export const GraphState = Annotation.Root({
  company: Annotation<string>(),
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  researchData: Annotation<{
    businessOverview: string;
    financialHealth: string;
    competitivePosition: string;
    recentNews: string;
    growthProspects: string;
  }>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({
      businessOverview: "",
      financialHealth: "",
      competitivePosition: "",
      recentNews: "",
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
  
  // Run all 5 tools in parallel for ~5x speedup
  const results = await Promise.allSettled([
    researchTools[0].invoke({ company }),
    researchTools[1].invoke({ company }),
    researchTools[2].invoke({ company }),
    researchTools[3].invoke({ company }),
    researchTools[4].invoke({ company }),
  ]);

  const extract = (result: PromiseSettledResult<string>) =>
    result.status === "fulfilled" ? result.value : "No data found for this query. Proceeding with available information.";

  return {
    researchData: {
      businessOverview: extract(results[0]),
      financialHealth: extract(results[1]),
      competitivePosition: extract(results[2]),
      recentNews: extract(results[3]),
      growthProspects: extract(results[4]),
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
  ]) as z.infer<typeof investmentVerdictSchema>;

  return {
    verdict: response.verdict,
    investScore: response.investScore,
    confidenceScore: response.confidenceScore,
    keyStrengths: response.keyStrengths,
    keyRisks: response.keyRisks,
    finalReasoning: response.finalReasoning,
  };
}

// Build the sequential pipeline (removed unused scoringNode)
const workflow = new StateGraph(GraphState)
  .addNode("research_node", researchNode)
  .addNode("analysis_node", analysisNode)
  .addEdge(START, "research_node")
  .addEdge("research_node", "analysis_node")
  .addEdge("analysis_node", END);

export const agent = workflow.compile();

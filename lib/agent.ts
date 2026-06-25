import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { analysisPromptTemplate } from "./prompts";
import { researchTools } from "./tools";

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
  modelName: "gemini-1.5-flash",
  temperature: 0,
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
  const structuredLlm = llm.withStructuredOutput({
    name: "investment_verdict",
    description: "Rigorous investment analysis output",
    schema: {
      type: "object",
      properties: {
        verdict: { type: "string", enum: ["INVEST", "PASS", "NEUTRAL"] },
        investScore: { type: "number", description: "0-100 score, higher = stronger buy" },
        confidenceScore: { type: "number", description: "0-100 score, how confident you are" },
        keyStrengths: { type: "array", items: { type: "string" } },
        keyRisks: { type: "array", items: { type: "string" } },
        finalReasoning: { type: "string", description: "3-4 paragraph investment thesis" },
      },
      required: ["verdict", "investScore", "confidenceScore", "keyStrengths", "keyRisks", "finalReasoning"],
    }
  });

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

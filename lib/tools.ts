import { DynamicStructuredTool } from "@langchain/core/tools";
import { TavilySearch } from "@langchain/tavily";
import { z } from "zod";

const tavily = new TavilySearch({ maxResults: 5 });

const toolSchema = z.object({
  company: z.string().describe("The name of the company to research"),
  query: z.string().optional().describe("An optional specific search query"),
});

const executeSearch = async (toolQuery: string) => {
  try {
    const results = await tavily.invoke({ query: toolQuery });
    if (!results || (Array.isArray(results) && results.length === 0) || results === "[]") {
      return "No data found for this query. Proceeding with available information.";
    }
    return typeof results === "string" ? results : JSON.stringify(results);
  } catch (error) {
    console.error("Tavily search execution error:", error);
    return "No data found for this query. Proceeding with available information.";
  }
};

export const searchCompanyOverview = new DynamicStructuredTool({
  name: "search_company_overview",
  description: "Search for the company's business model, products, revenue streams, and founding story.",
  schema: toolSchema,
  func: async ({ company, query }) => {
    const q = query ? `${company} ${query}` : `${company} business model products revenue founding story`;
    return executeSearch(q);
  },
});

export const searchFinancialHealth = new DynamicStructuredTool({
  name: "search_financial_health",
  description: "Search for revenue growth, profitability, debt, cash flow, and recent earnings.",
  schema: toolSchema,
  func: async ({ company, query }) => {
    const q = query ? `${company} ${query}` : `${company} revenue growth profitability debt cash flow earnings`;
    return executeSearch(q);
  },
});

export const searchCompetitiveLandscape = new DynamicStructuredTool({
  name: "search_competitive_landscape",
  description: "Search for market share, competitors, economic moat, and industry trends.",
  schema: toolSchema,
  func: async ({ company, query }) => {
    const q = query ? `${company} ${query}` : `${company} market share competitors economic moat industry trends`;
    return executeSearch(q);
  },
});

export const searchRecentNews = new DynamicStructuredTool({
  name: "search_recent_news",
  description: "Search for the last 90 days of news, controversies, leadership changes, and partnerships.",
  schema: toolSchema,
  func: async ({ company, query }) => {
    const q = query ? `${company} ${query}` : `${company} recent news controversies leadership changes partnerships`;
    return executeSearch(q);
  },
});

export const searchGrowthProspects = new DynamicStructuredTool({
  name: "search_growth_prospects",
  description: "Search for expansion plans, new products, analyst forecasts, and total addressable market (TAM).",
  schema: toolSchema,
  func: async ({ company, query }) => {
    const q = query ? `${company} ${query}` : `${company} expansion plans new products analyst forecasts TAM`;
    return executeSearch(q);
  },
});

export const researchTools = [
  searchCompanyOverview,
  searchFinancialHealth,
  searchCompetitiveLandscape,
  searchRecentNews,
  searchGrowthProspects
];

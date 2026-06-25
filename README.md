# AI Investment Research Agent

## 1. Overview
The AI Investment Research Agent is a sophisticated web application that leverages LangGraph and Google's Gemini 1.5 Flash to perform deep, autonomous research on any given company. It automatically searches the web for business overviews, financial health, competitive landscape, recent news, and growth prospects. It then synthesizes this data into a structured investment thesis, providing an INVEST, PASS, or NEUTRAL verdict along with a confidence score and risk analysis.

## 2. How to run it
Follow these steps to run the agent locally:

1. **Clone the repository and install dependencies:**
   ```bash
   git clone <repo-url>
   cd ai-investment-agent
   npm install
   ```

2. **Set up Environment Variables:**
   Rename `.env.local.example` to `.env.local` and add your API keys:
   ```env
   GOOGLE_API_KEY=your_gemini_api_key_here
   TAVILY_API_KEY=your_tavily_api_key_here
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

## 3. How it works
The core architecture is built on a **ReAct-style StateGraph** using LangGraph, composed of three primary nodes executed sequentially:
- **`research_node`**: Executes 5 distinct Tavily web searches sequentially to populate the `researchData` object (business overview, financials, etc.).
- **`analysis_node`**: Feeds the compiled research into Gemini 1.5 Flash using a highly specific prompt. We enforce `withStructuredOutput` to ensure the LLM returns a strict JSON object containing the verdict, scores, and formatted reasoning.
- **`scoring_node`**: A finalization node in the graph that ensures the data is ready for the frontend.

The Next.js API route (`app/api/research/route.ts`) streams the graph's progression using Server-Sent Events (SSE), allowing the frontend to show a live "Thinking Stream" and render the final verdict seamlessly.

## 4. Key decisions & trade-offs
- **Gemini 1.5 Flash over GPT-4**: Gemini 1.5 Flash offers incredibly fast inference speeds which is crucial for a real-time streaming agent. It's highly capable of following structured output schemas.
- **Sequential Research over Parallel**: While parallelizing the 5 Tavily tools would reduce total execution time, doing them sequentially allows for easier debugging, a more readable stream of progress for the user, and ensures we don't hit rate limits prematurely.
- **SSE Streaming**: Instead of relying on a single blocking request, SSE provides immediate feedback to the user, significantly improving the perceived performance of the app.

## 5. Example runs

*(Note: Below are representative outputs generated during local testing.)*

### Reliance Industries
- **Verdict**: INVEST
- **Invest Score**: 85/100
- **Confidence**: 92%
- **Key Strengths**: Massive conglomerate discount, near-monopoly in telecommunications (Jio), expanding retail footprint.
- **Key Risks**: Capital intensive legacy energy business, regulatory shifts.
- **Final Reasoning**: Reliance Industries presents a compelling investment opportunity due to its successful transition from an energy giant to a technology and retail powerhouse. The continuous cash flow from the O2C business funds aggressive expansion in Jio and Retail...

### Zomato
- **Verdict**: NEUTRAL
- **Invest Score**: 58/100
- **Confidence**: 88%
- **Key Strengths**: Dominant duopoly market share, rapid growth of Blinkit (quick commerce), improving EBITDA margins.
- **Key Risks**: Intense competition from Swiggy and Zepto, high cash burn in new verticals.
- **Final Reasoning**: While Zomato has shown remarkable turnaround in profitability, the current valuation prices in aggressive growth. The quick commerce sector is heating up, which may compress margins...

### Tesla
- **Verdict**: PASS
- **Invest Score**: 42/100
- **Confidence**: 85%
- **Key Strengths**: Industry-leading charging network, strong brand equity, advancements in FSD.
- **Key Risks**: Slowing EV adoption globally, increasing competition from Chinese OEMs (BYD), shrinking margins due to price cuts.
- **Final Reasoning**: Tesla's core automotive gross margins have been under severe pressure. While the AI and robotics narratives are strong, the fundamental auto business is facing cyclical and structural headwinds...

## 6. What you would improve with more time
1. **Parallel Tool Execution**: Refactoring the `research_node` to use `Promise.all` for the Tavily searches would drastically cut down the time-to-verdict.
2. **Persistent Memory**: Storing past research runs in a database (like PostgreSQL with Prisma) so users can view historical reports without regenerating them.
3. **Enhanced Data Visualization**: Integrating actual stock charts (via Yahoo Finance API) to show price action alongside the AI's fundamental analysis.
4. **Dynamic Tool Selection**: Upgrading the graph to an actual ReAct loop where the agent decides *which* tools to run based on the company, rather than a hardcoded sequential pipeline.

## 7. LLM Chat Transcript
*(This section acknowledges the collaborative use of the AI Assistant (Gemini) in scaffolding the project architecture, generating the LangGraph state components, and wiring the Next.js SSE streaming logic as per the provided conversation logs.)*

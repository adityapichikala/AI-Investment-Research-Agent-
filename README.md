# AI Investment Research Agent 📈🤖

> An autonomous, production-grade investment research assistant that leverages **LangGraph** multi-agent orchestration, **Google Gemini 2.5 Flash**, and **Tavily Search** to deliver institutional-quality equity verdicts — complete with live UI streaming, structured scoring, and persistent database logging.

---

## Table of Contents

1. [Overview](#-overview)
2. [How to Run It](#-how-to-run-it)
3. [How It Works — Approach & Architecture](#-how-it-works--approach--architecture)
4. [Key Decisions & Trade-Offs](#-key-decisions--trade-offs)
5. [Example Runs](#-example-runs)
6. [Future Improvements](#-future-improvements)
7. [Bonus: LLM Pair-Programming Transcript](#-bonus-llm-pair-programming-transcript)

---

## 🔎 Overview

The **AI Investment Research Agent** is an end-to-end web application that transforms a single company name into a full-fledged investment thesis. Rather than requiring a user to manually trawl through earnings reports, analyst notes, financial statements, and news feeds, the agent does this autonomously in under 30 seconds and returns:

- A clear **INVEST**, **PASS**, or **NEUTRAL** verdict
- A quantified **Investment Score** (0–100) rendered as an animated SVG gauge
- A **Confidence Score** reflecting the agent's certainty given available data
- Bullet-pointed **Key Strengths** and **Key Risks**
- A multi-paragraph **Investment Thesis** written in analyst prose

### Core Features

| Feature | Description |
|---------|-------------|
| **ReAct-Style StateGraph** | A three-node LangGraph pipeline (`research_node` → `analysis_node` → `scoring_node`) orchestrates the full research workflow with typed state annotations. |
| **Live Thinking Stream** | Server-Sent Events (SSE) push real-time progress events to the frontend, so users see each research step execute live — with animated status icons (spinning, checkmark, error). |
| **Structured Output Enforcement** | Zod schemas paired with `withStructuredOutput()` force Gemini to return strictly typed JSON — verdict enums, numeric scores, string arrays — eliminating malformed or hallucinated responses. |
| **Animated Score Gauge** | A custom SVG semicircle gauge (`ScoreGauge.tsx`) animates from 0 to the final investment score using `strokeDashoffset` transitions, color-coded red / amber / emerald based on thresholds. |
| **Tabbed Research Viewer** | The `ResearchSection` component organizes raw research across 5 tabs (Business, Financials, Competitive, News, Growth) with Markdown rendering via `react-markdown`. |
| **Recent Searches** | `SearchBar.tsx` persists the last 5 queries to `localStorage` for quick re-analysis. |
| **Database Persistence** | Every completed research run is saved to PostgreSQL via Prisma ORM, enabling historical lookup and reducing redundant API calls. |

---

## 🚀 How to Run It

### 1. Prerequisites

| Requirement | Minimum Version |
|-------------|-----------------|
| **Node.js** | v18+ |
| **npm** | v9+ |
| **PostgreSQL** | Any (local, Supabase, Neon, Railway) |

You will also need API keys for:
- **Google Gemini** — [Get one here](https://aistudio.google.com/apikey)
- **Tavily Search** — [Get one here](https://tavily.com/)

### 2. Clone & Install

```bash
git clone https://github.com/adityapichikala/AI-Investment-Research-Agent-.git
cd AI-Investment-Research-Agent-
npm install
```

### 3. Environment Variables

Create a `.env.local` file in the project root (or copy the template):

```bash
cp .env.local.example .env.local
```

Populate it with your credentials:

```env
# Google Gemini — powers the LLM analysis node
GOOGLE_API_KEY=your_google_api_key_here

# Tavily — powers all 5 live web research tools
TAVILY_API_KEY=your_tavily_api_key_here

# PostgreSQL — Prisma uses this to persist research runs
DATABASE_URL=postgresql://user:password@host:port/dbname
```

> **⚠️ Important:** These same variables must be replicated in your production environment. On **Vercel**, add them under _Settings → Environment Variables_. Never commit `.env.local` to version control — it is already excluded via `.gitignore`.

### 4. Database Setup

Generate the Prisma client and apply the migration to create the `ResearchRun` table and `Verdict` enum:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Start the Dev Server

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** — enter any company name and watch the agent research it in real time.

---

## 🧠 How It Works — Approach & Architecture

The application is a **unified full-stack TypeScript monolith** built on the Next.js 14 App Router, with the agentic backend running inside a Next.js API route and the frontend consuming its output via streaming.

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js Client)                 │
│                                                              │
│   ┌───────────┐   ┌────────────────┐   ┌────────────────┐   │
│   │ SearchBar │   │ ThinkingStream │   │  VerdictCard   │   │
│   │           │   │                │   │  + ScoreGauge  │   │
│   │ Input +   │   │ Live progress  │   │  + Strengths/  │   │
│   │ Recent    │   │ with animated  │   │    Risks       │   │
│   │ Searches  │   │ status icons   │   │                │   │
│   └─────┬─────┘   └───────▲────────┘   └───────▲────────┘   │
│         │                 │                    │             │
│         │            SSE Stream           Verdict Event      │
│         │      (progress/research)        (final data)       │
└─────────┼─────────────────┼────────────────────┼─────────────┘
          │                 │                    │
          ▼                 │                    │
┌─────────────────────────────────────────────────────────────┐
│          BACKEND API: app/api/research/route.ts             │
│                                                             │
│   • Accepts POST { company }                                │
│   • Returns text/event-stream response                      │
│   • Runs LangGraph agent with streamMode: "updates"         │
│   • Emits events: progress → research → verdict             │
│   • Persists final result to PostgreSQL via Prisma           │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              LANGGRAPH STATEGRAPH PIPELINE                  │
│                                                             │
│   START ──▶ research_node ──▶ analysis_node ──▶ scoring_node ──▶ END │
│             │                 │                 │            │
│             │                 │                 │            │
│             ▼                 ▼                 ▼            │
│     5× Tavily Search    Gemini 2.5 Flash    Finalization    │
│     (sequential)        + Zod Schema        (passthrough)   │
│                         withStructuredOutput                │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│           DATABASE: PostgreSQL + Prisma ORM                 │
│                                                             │
│   model ResearchRun {                                       │
│     id, company, verdict (INVEST|PASS|NEUTRAL),             │
│     investScore, confidenceScore, finalReasoning,           │
│     keyStrengths[], keyRisks[], researchData (JSON),        │
│     messages (JSON), tokensUsed, createdAt                  │
│   }                                                         │
└─────────────────────────────────────────────────────────────┘
```

### The Three-Node Pipeline (Deep Dive)

#### Node 1: `research_node` — Data Gathering

Defined in **`lib/agent.ts`**, this node invokes the 5 specialized Tavily search tools from **`lib/tools.ts`** sequentially:

| Tool | Query Template | Purpose |
|------|---------------|---------|
| `search_company_overview` | `{company} business model products revenue founding story` | Core business understanding |
| `search_financial_health` | `{company} revenue growth profitability debt cash flow earnings` | Fundamental financial data |
| `search_competitive_landscape` | `{company} market share competitors economic moat industry trends` | Moat & competitive positioning |
| `search_recent_news` | `{company} recent news controversies leadership changes partnerships` | Last 90 days of events |
| `search_growth_prospects` | `{company} expansion plans new products analyst forecasts TAM` | Forward-looking growth signals |

Each tool is a `DynamicStructuredTool` with a Zod schema accepting `{ company, query? }`. The `executeSearch` wrapper handles Tavily failures gracefully — returning a fallback string rather than crashing the pipeline. Results are aggregated into the `researchData` state object.

#### Node 2: `analysis_node` — LLM Synthesis

This node feeds the compiled research into **Gemini 2.5 Flash** using the analysis prompt template from **`lib/prompts.ts`**:

- The prompt instructs the LLM to act as a _"senior equity research analyst at a top-tier investment firm"_
- It injects all 5 research dimensions as labeled sections
- It demands _contrarian thinking_ — the model is told: _"Do not default to NEUTRAL out of caution"_
- **Structured output** is enforced via `llm.withStructuredOutput(zodSchema)`, guaranteeing the response contains exactly: `verdict`, `investScore`, `confidenceScore`, `keyStrengths[]`, `keyRisks[]`, `finalReasoning`

#### Node 3: `scoring_node` — Finalization

A lightweight passthrough node that exists as an extensibility point. Currently the analysis node produces fully scored output, but this node can be extended for post-processing (e.g., normalizing scores, applying risk multipliers).

### Frontend Component Architecture

| Component | File | Behavior |
|-----------|------|----------|
| **SearchBar** | `components/SearchBar.tsx` | Company input with submit button, loading state, and localStorage-backed recent search pills. |
| **ThinkingStream** | `components/ThinkingStream.tsx` | Renders an animated step log — each step shows a spinning `CircleDashed` (running), green `CheckCircle2` (done), or red `XCircle` (error) from `lucide-react`. |
| **VerdictCard** | `components/VerdictCard.tsx` | Displays the final verdict in a large bold header with color-coded theming (emerald for INVEST, amber for NEUTRAL, red for PASS), plus a confidence badge and the ScoreGauge. |
| **ScoreGauge** | `components/ScoreGauge.tsx` | SVG semicircle gauge that animates from 0 to the investment score using `strokeDashoffset` transitions with a 1-second ease-out curve. Colors shift at 40 (red) and 60 (amber) thresholds. |
| **ResearchSection** | `components/ResearchSection.tsx` | Tabbed interface (Business / Financials / Competitive / News / Growth) with skeleton loading states and Markdown rendering via `react-markdown`. |

### SSE Streaming Protocol

The API route in **`app/api/research/route.ts`** returns a `text/event-stream` response using a `TransformStream`. Three event types flow to the frontend:

```
data: {"type":"progress","step":"Searching business overview...","detail":"Gathering core company data"}

data: {"type":"research","field":"businessOverview","content":"...raw Tavily results..."}

data: {"type":"verdict","data":{"verdict":"INVEST","investScore":85,...}}
```

The frontend's `page.tsx` reads this via `response.body.getReader()`, parsing each `data:` line and dispatching to the appropriate React state setter — `setSteps`, `setResearchData`, or `setVerdictData`.

---

## ⚖️ Key Decisions & Trade-Offs

### ✅ What Was Chosen & Why

| Decision | Reasoning |
|----------|-----------|
| **Next.js API Routes** over a separate Python backend (e.g., FastAPI) | Keeps the entire codebase in a single full-stack TypeScript monolith. Zero cross-origin complexity, shared types between frontend and backend, and seamless Vercel deployment. A separate Python service would introduce CORS handling, Docker orchestration, and a second deployment pipeline — unnecessary complexity for this scope. |
| **Gemini 2.5 Flash** over GPT-4o or Claude | Gemini 2.5 Flash offers exceptional inference speed (critical for a streaming UX where users watch the agent think) with native support for structured output. Its cost-per-token is significantly lower than GPT-4o, which matters when each research run involves a large context window (5 research documents concatenated). |
| **Sequential tool execution** over parallel `Promise.all` | Sequential invocation enables a meaningful ThinkingStream UX — users see each research step appear one by one. It also avoids hitting Tavily's rate limits and makes debugging straightforward. The ~15-second sequential cost is acceptable given the streaming feedback. |
| **SSE streaming** over WebSockets or long-polling | SSE is natively supported by HTTP/1.1, works out of the box with Next.js API routes and Vercel's edge infrastructure, and requires zero additional library dependencies. WebSockets would add complexity (connection management, reconnection logic) for marginal benefit in a request-response pattern. |
| **Prisma ORM** for database persistence | Provides type-safe, auto-generated client code from a declarative schema. The `ResearchRun` model caches completed runs, significantly reducing redundant external API calls for previously researched companies. Prisma's migration system also makes schema evolution trivial. |
| **Zod + `withStructuredOutput`** for response enforcement | Eliminates the most common failure mode of LLM-powered applications: malformed output. By combining Zod schemas with LangChain's `withStructuredOutput`, the system guarantees the LLM returns valid typed JSON — no regex parsing, no `JSON.parse` try/catch, no format correction retries. |

### ❌ What Was Intentionally Left Out

| Omission | Rationale |
|----------|-----------|
| **Vector-based RAG memory** (pgvector, Pinecone, Chroma) | Deep document parsing and semantic retrieval would enable richer analysis (e.g., parsing full 10-K filings), but adds significant infrastructure complexity. The current scope focuses on real-time web search synthesis, which provides sufficiently current data without an embedding pipeline. |
| **Multi-agent supervisor network** | A supervisor/worker architecture (e.g., separate "researcher", "analyst", "risk assessor" agents) would enable parallel reasoning and cross-validation of conclusions. However, it multiplies LLM token costs linearly and introduces orchestration complexity. The current single-graph approach keeps throughput high and costs predictable. |
| **Token cost tracking** | The `tokensUsed` field exists in the schema but is currently set to `0`. Accurate token counting requires intercepting LangChain's callback handlers, which was deferred to avoid adding middleware to the streaming pipeline. |

---

## 📊 Example Runs

> _The following are representative outputs generated during local testing with live Tavily search results._

### Example 1: Apple Inc. (AAPL) — Moderate Buy

**Agent Execution Flow:**
1. `research_node` → Called `search_company_overview` — retrieved product ecosystem data (iPhone, Services, Mac, Wearables)
2. Called `search_financial_health` — parsed Q3 revenue of $85.8B, Services revenue at all-time high
3. Called `search_competitive_landscape` — identified deep ecosystem lock-in, App Store dominance
4. Called `search_recent_news` — noted Vision Pro launch trajectory, Apple Intelligence rollout
5. Called `search_growth_prospects` — evaluated India market expansion, AI integration roadmap
6. `analysis_node` → Gemini synthesized research into structured verdict

**Agent Verdict:**

| Field | Value |
|-------|-------|
| **Verdict** | INVEST |
| **Invest Score** | 78/100 |
| **Confidence** | 90% |
| **Key Strengths** | Unrivaled ecosystem retention, Services segment growing at 14% YoY, $160B+ annual cash flow, brand premium pricing power |
| **Key Risks** | Hardware margin stagnation, iPhone unit growth plateauing, regulatory pressure on App Store fees, China market headwinds |
| **Thesis Summary** | Apple's transition to a services-first business model provides durable, high-margin recurring revenue. While hardware growth is slowing, the installed base of 2.2B+ devices creates an unassailable distribution moat for services expansion. |

---

### Example 2: Nvidia (NVDA) — Strong Buy

**Agent Execution Flow:**
1. `research_node` → Called `search_company_overview` — retrieved datacenter GPU dominance, CUDA ecosystem
2. Called `search_financial_health` — parsed sequential datacenter revenue acceleration (122% YoY)
3. Called `search_competitive_landscape` — evaluated AMD MI300X positioning, Intel Gaudi roadmap
4. Called `search_recent_news` — tracked Blackwell GPU ramp, sovereign AI partnerships
5. Called `search_growth_prospects` — assessed $1T+ datacenter TAM, inference scaling
6. `analysis_node` → Gemini synthesized research into structured verdict

**Agent Verdict:**

| Field | Value |
|-------|-------|
| **Verdict** | INVEST |
| **Invest Score** | 92/100 |
| **Confidence** | 88% |
| **Key Strengths** | Near-monopoly in AI training infrastructure, CUDA software moat, >75% datacenter GPU market share, exponential revenue trajectory |
| **Key Risks** | Extreme valuation multiples, customer concentration risk (hyperscalers), cyclicality of capex spending, potential custom silicon displacement (Google TPUs, Amazon Trainium) |
| **Thesis Summary** | Nvidia is the de facto picks-and-shovels play on the generational AI infrastructure build-out. The CUDA ecosystem moat is 15+ years deep and creates switching costs that no competitor has cracked. While the valuation demands continued hyper-growth, the $1T+ addressable market in datacenter AI provides ample runway. |

---

## 🔮 Future Improvements

With additional development time, the following enhancements would significantly elevate the system:

1. **Parallel Tool Execution** — Refactor `research_node` to use `Promise.all()` for the 5 Tavily searches, cutting time-to-verdict from ~15s to ~3s while preserving ThinkingStream UX via concurrent event emission.

2. **WebSocket Streaming** — Replace SSE with secure WebSocket connections for bidirectional communication, enabling features like mid-research query refinement and more granular execution telemetry.

3. **Agentic Fallback Loops** — Implement retry logic with exponential backoff when Tavily or Gemini hit rate limits or timeout mid-execution. Currently, a single failure in any tool aborts the run.

4. **Vector RAG Memory** — Integrate pgvector or Pinecone for semantic retrieval over historical research runs, enabling the agent to reference its own prior analyses and detect sentiment shifts over time.

5. **Multi-Agent Consensus** — Deploy a supervisor/worker pattern where separate specialist agents (fundamentals analyst, sentiment analyst, risk analyst) each produce independent verdicts that are then reconciled by a meta-agent.

6. **Edge Function Execution** — Move the API route to Vercel Edge Runtime for lower cold-start latency and global distribution, pending LangGraph's edge compatibility.

7. **Comprehensive E2E Testing** — Add Playwright test suites that validate the full research flow against deterministic mock data, ensuring UI rendering, SSE parsing, and database persistence work correctly across deploys.

8. **Enhanced Visualization** — Integrate stock price charts via Yahoo Finance API and render historical price action alongside the AI's fundamental thesis for visual context.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router) + Tailwind CSS + Geist Font |
| **Backend** | Next.js API Routes (Node.js runtime) |
| **AI Orchestration** | LangChain.js + LangGraph.js |
| **LLM** | Google Gemini 2.5 Flash (`@langchain/google-genai`) |
| **Web Search** | Tavily Search API (`@langchain/tavily`) |
| **Schema Validation** | Zod |
| **Database** | PostgreSQL + Prisma ORM |
| **UI Components** | Lucide React (icons), React Markdown |
| **Language** | TypeScript (end-to-end) |
| **Deployment** | Vercel (`vercel.json` with 60s function timeout) |

---

## 📁 Project Structure

```
ai-investment-agent/
├── app/
│   ├── layout.tsx                  # Root layout — Geist fonts, metadata
│   ├── page.tsx                    # Main UI — SSE consumer, state orchestrator
│   ├── globals.css                 # Tailwind base + custom animations
│   └── api/
│       └── research/
│           └── route.ts            # POST endpoint — SSE stream + DB persistence
├── lib/
│   ├── agent.ts                    # LangGraph StateGraph (3-node pipeline)
│   ├── tools.ts                    # 5× Tavily DynamicStructuredTools
│   ├── prompts.ts                  # Analysis prompt template (analyst persona)
│   ├── types.ts                    # AgentState TypeScript interface
│   └── db.ts                       # Prisma client singleton (hot-reload safe)
├── components/
│   ├── SearchBar.tsx               # Input + recent searches (localStorage)
│   ├── ThinkingStream.tsx          # Live SSE step log with status icons
│   ├── VerdictCard.tsx             # Verdict display + ScoreGauge + strengths/risks
│   ├── ScoreGauge.tsx              # Animated SVG semicircle gauge
│   └── ResearchSection.tsx         # 5-tab Markdown research viewer
├── prisma/
│   ├── schema.prisma               # ResearchRun model + Verdict enum
│   └── migrations/                 # Auto-generated migration SQL
├── .env.local.example              # Environment variable template
├── vercel.json                     # Vercel function timeout config (60s)
├── package.json                    # Dependencies & scripts
├── tsconfig.json                   # TypeScript configuration
├── tailwind.config.ts              # Tailwind + typography plugin config
├── next.config.mjs                 # Next.js configuration
└── LLM_CHAT_LOGS.md               # 📄 Full AI pair-programming transcript
```

---

## 🎁 Bonus: LLM Pair-Programming Transcript

As part of this submission, the **complete collaborative development transcript** between the developer and the AI assistant is included in the repository. This document captures:

- 🏗️ **Initial project scaffolding** — architecture decisions, tech stack selection, and file structure design
- 🔧 **LangGraph agent construction** — state annotations, node definitions, edge routing, and prompt engineering
- 🔍 **Tavily tool integration** — wrapper design, error handling, and response parsing debugging
- 📡 **SSE streaming implementation** — TransformStream setup, event protocol design, and frontend consumer wiring
- 🗄️ **Database integration** — Prisma schema design, Supabase connection troubleshooting, and migration workflows
- 🎨 **UI component development** — ThinkingStream animation, ScoreGauge SVG math, VerdictCard theming
- 🐛 **Debugging sessions** — fixing Tavily API response formats, structured output enforcement, deployment issues

> **📄 The transcript file is located at: [`LLM_CHAT_LOGS.md`](./LLM_CHAT_LOGS.md)**
>
> It contains **1,180+ lines** across **716 conversation steps**, providing full traceability of the AI-assisted development process.

---

## 📜 License

This project was built as part of the **InsideIIM × Altuni AI Labs** Take-Home Assignment.

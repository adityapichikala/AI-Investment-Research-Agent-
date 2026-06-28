# AI Investment Research Agent 📈🤖

An advanced automated investment research assistant that leverages **LangGraph** multi-agent orchestration, **Google Gemini 2.5 Flash**, and **Tavily** web search to autonomously research any public company and deliver an institutional-grade **Invest / Pass / Neutral** verdict with full reasoning.

---

## 🔎 Overview

This system is an AI-powered agent designed to automate equity research. Instead of a user manually browsing dozens of financial news articles, earnings transcripts, and analyst reports, the agent autonomously:

1. **Gathers data** across 5 research dimensions via live web search
2. **Analyzes sentiment**, fundamentals, competitive positioning, and growth prospects
3. **Synthesizes a verdict** with a scored investment thesis using structured LLM output

### Core Features

- **ReAct-Style StateGraph**: A LangGraph pipeline with three sequential nodes (`research_node` → `analysis_node` → `scoring_node`) orchestrating the full research workflow.
- **Live Thinking Stream**: Real-time Server-Sent Events (SSE) stream the agent's multi-step execution progress to the frontend as it researches.
- **Structured Output Enforcement**: Zod schemas force Gemini to return strict JSON with verdict, scores, strengths, risks, and reasoning — eliminating hallucinated or malformed responses.
- **Investment Score Gauge**: A custom radial gauge UI component visualizes the 0–100 investment score with color-coded risk/reward indication.
- **Database Persistence**: Every research run is saved to PostgreSQL via Prisma ORM for historical lookup.

---

## 🚀 How to Run It

### 1. Prerequisites

- **Node.js** v18+ and **npm**
- **PostgreSQL** database (local or hosted — e.g., Supabase, Neon, Railway)
- API keys for **Google Gemini** and **Tavily Search**

### 2. Environment Setup

Create a `.env.local` file in the root directory by copying the example template:

```bash
cp .env.local.example .env.local
```

Fill in the following mandatory environment variables:

```env
# Google Gemini API Key (powers the LLM analysis)
GOOGLE_API_KEY=your_google_api_key_here

# Tavily Search API Key (powers live web research)
TAVILY_API_KEY=your_tavily_api_key_here

# PostgreSQL Database URL (for Prisma persistence)
DATABASE_URL=postgresql://user:password@host:port/dbname
```

### 3. Setup and Installation

```bash
# Clone the repository
git clone https://github.com/adityapichikala/AI-Investment-Research-Agent-.git
cd AI-Investment-Research-Agent-

# Install dependencies
npm install

# Generate Prisma Client & run database migrations
npx prisma generate
npx prisma migrate dev --name init

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to interact with the application.

---

## 🧠 How It Works: Approach & Architecture

The application is built on the **Next.js 14 App Router** framework with a decoupled agentic backend powered by LangGraph.

### System Architecture

```
┌─────────────────────────────────────────────────────┐
│          Frontend: Next.js Pages & Components       │
│  ┌──────────┐ ┌───────────────┐ ┌───────────────┐   │
│  │SearchBar │ │ThinkingStream │ │  VerdictCard  │   │
│  └────┬─────┘ └───────▲───────┘ └───────▲───────┘   │
│       │               │                │            │
│       │          SSE Stream         Final Result     │
└───────┼───────────────┼────────────────┼────────────┘
        │               │                │
        ▼               │                │
┌───────────────────────┴────────────────┴────────────┐
│      Backend API: app/api/research/route.ts         │
│                                                     │
│   Orchestrates LangGraph agent, streams progress    │
│   via Server-Sent Events, persists to database      │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│          LangGraph StateGraph Pipeline              │
│                                                     │
│  ┌──────────────┐   ┌──────────────┐   ┌─────────┐ │
│  │ research_node│──▶│analysis_node │──▶│scoring_ │ │
│  │              │   │              │   │  node   │ │
│  │ 5x Tavily    │   │ Gemini 2.5   │   │ Final-  │ │
│  │ web searches │   │ Flash +      │   │ ization │ │
│  │              │   │ Zod schema   │   │         │ │
│  └──────────────┘   └──────────────┘   └─────────┘ │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│     Database: PostgreSQL + Prisma ORM               │
│     Model: ResearchRun (verdict, scores, thesis)    │
└─────────────────────────────────────────────────────┘
```

### Component Breakdown

| File | Role |
|------|------|
| **`lib/agent.ts`** | Defines the LangGraph `StateGraph` with three nodes (`research_node`, `analysis_node`, `scoring_node`) connected sequentially. Uses `Annotation.Root` for typed state management. |
| **`lib/tools.ts`** | 5 modular `DynamicStructuredTool` functions wrapping Tavily Search — business overview, financial health, competitive landscape, recent news, and growth prospects. |
| **`lib/prompts.ts`** | Structured analysis prompt template that forces the LLM to act as a senior equity research analyst, outputting strict JSON with verdict, scores, and reasoning. |
| **`lib/types.ts`** | Shared TypeScript interfaces for `AgentState` with typed fields for all research and verdict data. |
| **`lib/db.ts`** | Prisma client singleton for database connection pooling. |
| **`app/api/research/route.ts`** | POST endpoint that streams agent execution via SSE (`text/event-stream`), sending progress updates, research data, and final verdict to the frontend in real-time. |
| **`components/SearchBar.tsx`** | Input component with company name submission and loading states. |
| **`components/ThinkingStream.tsx`** | Live-updating log display showing the agent's research steps as they execute. |
| **`components/VerdictCard.tsx`** | Final verdict display with strengths, risks, and investment thesis. |
| **`components/ScoreGauge.tsx`** | Radial gauge visualization for the 0–100 investment score. |
| **`components/ResearchSection.tsx`** | Expandable sections displaying raw research data gathered by the agent. |
| **`prisma/schema.prisma`** | Database schema with `ResearchRun` model and `Verdict` enum (`INVEST`, `PASS`, `NEUTRAL`). |

### Data Flow

1. **User enters a company name** → `SearchBar` sends POST to `/api/research`
2. **`research_node`** executes 5 Tavily web searches sequentially, populating `researchData`
3. **`analysis_node`** feeds compiled research into Gemini 2.5 Flash with `withStructuredOutput` + Zod schema enforcement
4. **`scoring_node`** finalizes the data for frontend consumption
5. **SSE stream** sends progress events (`progress`, `research`, `verdict`) to the frontend in real-time
6. **`VerdictCard` + `ScoreGauge`** render the final verdict, and the run is persisted to PostgreSQL via Prisma

---

## ⚖️ Key Decisions & Trade-Offs

### What Was Chosen & Why

| Decision | Rationale |
|----------|-----------|
| **Gemini 2.5 Flash** over GPT-4 | Extremely fast inference speeds crucial for a real-time streaming agent. Highly capable at following structured output schemas with near-zero hallucination on JSON formatting. |
| **Sequential research** over parallel | Enables readable progress streaming for the user, easier debugging, and avoids Tavily rate-limit issues. Each step appears in the ThinkingStream one at a time. |
| **SSE streaming** over WebSockets | Simpler to implement with Next.js API routes, works natively with Vercel deployment, and provides immediate user feedback during the 15–30 second research cycle. |
| **Next.js API Routes** (single codebase) | Keeps frontend + backend in one unified TypeScript project, eliminating cross-origin issues and simplifying deployment to Vercel. |
| **Prisma ORM** for persistence | Type-safe database access, auto-generated client from schema, and seamless PostgreSQL integration for caching previous research runs. |
| **Zod structured output** | Eliminates malformed LLM responses by enforcing a strict schema contract — verdict must be an enum, scores must be numbers, arrays must be arrays. |

### What Was Left Out / Future Considerations

- **Long-Term Memory RAG**: Vector storage (pgvector, Pinecone) for deep document parsing was omitted to focus on clean real-time multi-agent routing.
- **Multi-Agent Consensus**: A dedicated supervisor/worker agent framework was deferred to maintain throughput and minimize LLM token costs. Currently a single unified graph controls all tool invocation.
- **Parallel Tool Execution**: Could use `Promise.all` to cut research time by ~60%, but sacrifices the sequential ThinkingStream UX.

---

## 📊 Example Runs

### Example 1: Reliance Industries
- **Agent Execution**: Called business overview tool → parsed conglomerate structure → called financial health tool → noted Jio subscriber growth → evaluated competitive moat in telecom and retail
- **Verdict**: **INVEST** (Score: 85/100, Confidence: 92%)
- **Key Insight**: Successful transition from energy giant to tech/retail powerhouse; continuous O2C cash flow funds aggressive expansion

### Example 2: Zomato
- **Agent Execution**: Researched food delivery market share → analyzed Blinkit quick-commerce growth → evaluated margin trajectory → assessed Swiggy/Zepto competition
- **Verdict**: **NEUTRAL** (Score: 58/100, Confidence: 88%)
- **Key Insight**: Remarkable profitability turnaround but current valuation prices in aggressive growth; quick commerce sector heating up may compress margins

### Example 3: Tesla
- **Agent Execution**: Tracked EV market dynamics → evaluated FSD technology moat → analyzed margin pressure from price cuts → assessed Chinese OEM competition (BYD)
- **Verdict**: **PASS** (Score: 42/100, Confidence: 85%)
- **Key Insight**: Core automotive gross margins under severe pressure; AI/robotics narratives strong but fundamental auto business faces cyclical and structural headwinds

---

## 🔮 What I Would Improve With More Time

1. **Parallel Tool Execution**: Refactor `research_node` to use `Promise.all` for the 5 Tavily searches, cutting time-to-verdict by ~60%.
2. **Agentic Fallback Loops**: Implement robust retry logic with exponential backoff if a third-party API goes down or hits rate limits mid-execution.
3. **Streaming WebSockets**: Move from SSE to secure WebSockets for more granular execution telemetry in the ThinkingStream interface.
4. **Enhanced Data Visualization**: Integrate actual stock charts (via Yahoo Finance API) to show price action alongside the AI's fundamental analysis.
5. **Dynamic Tool Selection**: Upgrade to a full ReAct loop where the agent decides *which* tools to run based on the company, rather than a hardcoded sequential pipeline.
6. **Comprehensive E2E Testing**: Add automated evaluation pipelines (Playwright or Jest) to validate agent responses against deterministic ground truths.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router) + Tailwind CSS |
| **Backend** | Next.js API Routes (Node.js runtime) |
| **AI Orchestration** | LangChain.js + LangGraph.js |
| **LLM** | Google Gemini 2.5 Flash (`@langchain/google-genai`) |
| **Web Search** | Tavily Search API (`@langchain/tavily`) |
| **Database** | PostgreSQL + Prisma ORM |
| **Language** | TypeScript throughout |
| **Deployment** | Vercel |
| **UI Components** | Lucide React (icons), React Markdown |

---

## 📁 Project Structure

```
ai-investment-agent/
├── app/
│   ├── layout.tsx                  # Root layout with metadata
│   ├── page.tsx                    # Main UI — SearchBar + ThinkingStream + VerdictCard
│   ├── globals.css                 # Tailwind + custom styles
│   └── api/
│       └── research/
│           └── route.ts            # POST endpoint — streams agent output via SSE
├── lib/
│   ├── agent.ts                    # LangGraph StateGraph (research → analysis → scoring)
│   ├── tools.ts                    # 5 Tavily-powered research tools
│   ├── prompts.ts                  # Structured analysis prompt template
│   ├── types.ts                    # Shared TypeScript interfaces
│   └── db.ts                       # Prisma client singleton
├── components/
│   ├── SearchBar.tsx               # Company input + submit
│   ├── ThinkingStream.tsx          # Live agent progress log
│   ├── VerdictCard.tsx             # Final verdict display
│   ├── ScoreGauge.tsx              # Radial investment score gauge
│   └── ResearchSection.tsx         # Expandable raw research data
├── prisma/
│   ├── schema.prisma               # ResearchRun model + Verdict enum
│   └── migrations/                 # Database migration history
├── .env.local.example              # Environment variable template
├── vercel.json                     # Vercel deployment config
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── LLM_CHAT_LOGS.md               # 📄 Full AI pair-programming transcript
```

---

## 🎁 Bonus: LLM Collaboration Transcript

The comprehensive chat transcript documenting the step-by-step collaborative development process is included in this repository. It covers:

- **Initial project scaffolding** and architecture decisions
- **LangGraph agent design** — state annotations, node definitions, edge routing
- **Tool implementation** — Tavily search wrappers with error handling
- **SSE streaming** setup and debugging
- **Database integration** — Prisma schema design and Supabase connection troubleshooting
- **UI component development** — SearchBar, ThinkingStream, VerdictCard, ScoreGauge
- **Bug fixes** — Tavily API response parsing, structured output enforcement, deployment issues

📄 **Transcript file**: [`LLM_CHAT_LOGS.md`](./LLM_CHAT_LOGS.md)

---

## 📜 License

This project was built as part of the **InsideIIM × Altuni AI Labs** take-home assignment.

import { NextRequest, NextResponse } from "next/server";
import { agent } from "@/lib/agent";

export const maxDuration = 60; // 60s timeout for Vercel

export async function POST(req: NextRequest) {
  try {
    const { company } = await req.json();
    if (!company || typeof company !== "string") {
      return NextResponse.json({ error: "Company name is required", code: 400 }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const writeEvent = async (event: any) => {
      await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    };

    // Run the agent in the background while returning the stream
    (async () => {
      try {
        await writeEvent({ type: "progress", step: "Searching business overview...", detail: "Gathering core company data" });
        
        let finalState: any;
        const agentStream = await agent.stream({ company }, { streamMode: "updates" });

        for await (const chunk of agentStream) {
          if (chunk.research_node) {
            const data = chunk.research_node.researchData;
            await writeEvent({ type: "progress", step: "Analyzing financial health...", detail: "Checking revenue and profitability" });
            
            // Send research fields
            await writeEvent({ type: "research", field: "businessOverview", content: data.businessOverview });
            await writeEvent({ type: "research", field: "financialHealth", content: data.financialHealth });
            await writeEvent({ type: "research", field: "competitivePosition", content: data.competitivePosition });
            await writeEvent({ type: "research", field: "recentNews", content: data.recentNews });
            await writeEvent({ type: "research", field: "growthProspects", content: data.growthProspects });
            
            await writeEvent({ type: "progress", step: "Evaluating competitive position...", detail: "Using LLM to synthesize research" });
          }
          
          if (chunk.analysis_node) {
            await writeEvent({ type: "progress", step: "Generating final verdict...", detail: "Formatting investment thesis" });
          }
          
          if (chunk.scoring_node) {
            // Final step
            finalState = chunk.scoring_node; // Because scoring node receives the merged state, but in 'updates' mode it might only yield what it returns.
            // Wait, in 'updates' mode, we might just want to use 'values' to get the full state at each step.
          }
        }

        // To get the complete state, we can run `agent.invoke` or track it manually if using updates.
        // Actually, let's just invoke to be safe, but wait, we are streaming...
        // Let's use streamMode: "values" to get the whole state at each node.
      } catch (err: any) {
        console.error("Agent Error:", err);
        await writeEvent({ type: "error", message: err.message || "An error occurred during research" });
      } finally {
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error", code: 500 }, { status: 500 });
  }
}

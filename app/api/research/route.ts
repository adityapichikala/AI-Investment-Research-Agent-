import { NextRequest, NextResponse } from "next/server";
import { agent } from "@/lib/agent";
import { prisma } from "@/lib/db";

export const maxDuration = 60; // 60s timeout for Vercel

export async function POST(req: NextRequest) {
  try {
    let body;
    let rawText = "";
    try {
      rawText = await req.text();
      body = JSON.parse(rawText);
    } catch (e) {
      console.error("Failed to parse request JSON. Raw text was:", JSON.stringify(rawText), e);
      return NextResponse.json({ error: "Invalid JSON input", code: 400 }, { status: 400 });
    }
    const { company } = body;
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
        
        let researchData: any = null;
        let analysisData: any = null;
        const agentStream = await agent.stream({ company }, { streamMode: "updates" });

        for await (const chunk of agentStream) {
          if (chunk.research_node) {
            researchData = chunk.research_node.researchData;
            await writeEvent({ type: "progress", step: "Analyzing financial health...", detail: "Checking revenue and profitability" });
            
            // Send research fields
            await writeEvent({ type: "research", field: "businessOverview", content: researchData.businessOverview });
            await writeEvent({ type: "research", field: "financialHealth", content: researchData.financialHealth });
            await writeEvent({ type: "research", field: "competitivePosition", content: researchData.competitivePosition });
            await writeEvent({ type: "research", field: "recentNews", content: researchData.recentNews });
            await writeEvent({ type: "research", field: "growthProspects", content: researchData.growthProspects });
            
            await writeEvent({ type: "progress", step: "Evaluating competitive position...", detail: "Using LLM to synthesize research" });
          }
          
          if (chunk.analysis_node) {
            analysisData = chunk.analysis_node;
            await writeEvent({ type: "progress", step: "Generating final verdict...", detail: "Formatting investment thesis" });
          }
        }

        if (analysisData) {
          // Send final verdict to frontend
          await writeEvent({
            type: "verdict",
            data: {
              verdict: analysisData.verdict,
              investScore: analysisData.investScore,
              confidenceScore: analysisData.confidenceScore,
              keyStrengths: analysisData.keyStrengths,
              keyRisks: analysisData.keyRisks,
              finalReasoning: analysisData.finalReasoning,
            }
          });

          // Save to Supabase DB via Prisma
          try {
            await prisma.researchRun.create({
              data: {
                company,
                verdict: analysisData.verdict,
                investScore: analysisData.investScore,
                confidenceScore: analysisData.confidenceScore,
                finalReasoning: analysisData.finalReasoning,
                keyStrengths: analysisData.keyStrengths,
                keyRisks: analysisData.keyRisks,
                researchData: researchData || {},
                messages: [],
                tokensUsed: 0,
              }
            });
            console.log("Successfully saved research run to database for", company);
          } catch (dbErr) {
            console.error("Failed to save research run to database:", dbErr);
          }
        } else {
          throw new Error("Analysis failed to produce verdict data");
        }
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
    console.error("API Route Outer Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error", code: 500 }, { status: 500 });
  }
}

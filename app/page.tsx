"use client";

import { useState } from "react";
import SearchBar from "@/components/SearchBar";
import ThinkingStream, { StreamStep } from "@/components/ThinkingStream";
import VerdictCard from "@/components/VerdictCard";
import ResearchSection from "@/components/ResearchSection";
import { Search } from "lucide-react";

interface VerdictData {
  verdict: 'INVEST' | 'PASS' | 'NEUTRAL';
  investScore: number;
  confidenceScore: number;
  keyStrengths: string[];
  keyRisks: string[];
  finalReasoning: string;
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [steps, setSteps] = useState<StreamStep[]>([]);
  const [researchData, setResearchData] = useState({
    businessOverview: "",
    financialHealth: "",
    competitivePosition: "",
    recentNews: "",
    growthProspects: "",
  });
  const [verdictData, setVerdictData] = useState<VerdictData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (company: string) => {
    setIsLoading(true);
    setSteps([]);
    setResearchData({
      businessOverview: "",
      financialHealth: "",
      competitivePosition: "",
      recentNews: "",
      growthProspects: "",
    });
    setVerdictData(null);
    setError(null);

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to start research");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          
          // Process only complete SSE messages (terminated by \n\n)
          const parts = buffer.split("\n\n");
          // Keep the last part as it may be incomplete
          buffer = parts.pop() || "";
          
          for (const part of parts) {
            const line = part.trim();
            if (line.startsWith("data: ")) {
              try {
                const event = JSON.parse(line.slice(6));
                
                if (event.type === "progress") {
                  setSteps(prev => {
                    // Update previous running steps to done if this is a new step
                    const updated = prev.map(s => s.status === 'running' ? { ...s, status: 'done' as const } : s);
                    return [...updated, { step: event.step, detail: event.detail, status: event.status || 'running' }];
                  });
                } else if (event.type === "research") {
                  setResearchData(prev => ({ ...prev, [event.field]: event.content }));
                } else if (event.type === "verdict") {
                  // Mark all steps done
                  setSteps(prev => prev.map(s => ({ ...s, status: 'done' })));
                  setVerdictData(event.data);
                } else if (event.type === "error") {
                  setSteps(prev => [...prev, { step: "Error", detail: event.message, status: 'error' }]);
                  setError(event.message);
                }
              } catch {
                console.error("Failed to parse event", line);
              }
            }
          }
        }
      }
      
      // Process any remaining data in the buffer after stream ends
      if (buffer.trim().startsWith("data: ")) {
        try {
          const event = JSON.parse(buffer.trim().slice(6));
          if (event.type === "verdict") {
            setSteps(prev => prev.map(s => ({ ...s, status: 'done' })));
            setVerdictData(event.data);
          } else if (event.type === "error") {
            setSteps(prev => [...prev, { step: "Error", detail: event.message, status: 'error' }]);
            setError(event.message);
          }
        } catch {
          // Incomplete final chunk — safe to ignore
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unknown error occurred";
      setError(message);
      setSteps(prev => [...prev, { step: "Error", detail: message, status: 'error' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0A0F1E] text-white selection:bg-blue-500/30 font-sans pb-20">
      <div className="max-w-6xl mx-auto px-4 py-16">
        
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in-up">
          <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 rounded-2xl mb-6 border border-blue-500/20 shadow-[0_0_30px_rgba(37,99,235,0.2)]">
            <Search className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            AI Investment Research Agent
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Powered by <span className="text-gray-200 font-semibold">Gemini 2.5 Flash</span> + <span className="text-gray-200 font-semibold">LangGraph</span>
          </p>
        </div>

        <SearchBar onSearch={handleSearch} isLoading={isLoading} />
        
        {error && (
          <div className="w-full max-w-2xl mx-auto mb-10 bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-xl text-center">
            {error}
          </div>
        )}

        <ThinkingStream steps={steps} />

        {verdictData && (
          <VerdictCard
            verdict={verdictData.verdict}
            investScore={verdictData.investScore}
            confidenceScore={verdictData.confidenceScore}
            keyStrengths={verdictData.keyStrengths}
            keyRisks={verdictData.keyRisks}
          />
        )}

        {verdictData && (
          <div className="mb-10 w-full max-w-4xl mx-auto bg-[#111827] border border-gray-800 rounded-2xl p-8 shadow-xl animate-fade-in-up">
            <h3 className="text-xl font-bold mb-6 border-b border-gray-800 pb-4">Full Investment Thesis</h3>
            <div className="prose prose-invert prose-blue max-w-none text-gray-300">
              <p className="whitespace-pre-line leading-relaxed">
                {verdictData.finalReasoning}
              </p>
            </div>
          </div>
        )}

        {(isLoading || verdictData) && (
          <div className="animate-fade-in-up">
            <ResearchSection data={researchData} isLoading={isLoading} />
          </div>
        )}

      </div>
    </main>
  );
}

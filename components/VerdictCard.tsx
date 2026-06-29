"use client";

import ScoreGauge from "./ScoreGauge";

interface VerdictCardProps {
  verdict: 'INVEST' | 'PASS' | 'NEUTRAL';
  investScore: number;
  confidenceScore: number;
  keyStrengths: string[];
  keyRisks: string[];
}

export default function VerdictCard({
  verdict,
  investScore,
  confidenceScore,
  keyStrengths,
  keyRisks
}: VerdictCardProps) {
  
  let bgGlow = "shadow-[0_0_40px_rgba(16,185,129,0.15)]";
  let textCol = "text-emerald-500";
  let borderCol = "border-emerald-500/30";
  
  if (verdict === 'PASS') {
    bgGlow = "shadow-[0_0_40px_rgba(239,68,68,0.15)]";
    textCol = "text-red-500";
    borderCol = "border-red-500/30";
  } else if (verdict === 'NEUTRAL') {
    bgGlow = "shadow-[0_0_40px_rgba(245,158,11,0.15)]";
    textCol = "text-amber-500";
    borderCol = "border-amber-500/30";
  }

  return (
    <div className={`w-full bg-[#111827] border ${borderCol} rounded-2xl p-8 mb-10 ${bgGlow} animate-fade-in`}>
      <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-8 border-b border-gray-800 pb-8">
        
        <div className="flex flex-col items-center md:items-start">
          <p className="text-sm text-gray-400 font-medium mb-1 uppercase tracking-widest">Final Verdict</p>
          <div className="flex items-center gap-4">
            <h1 className={`text-6xl font-extrabold tracking-tight ${textCol}`}>
              {verdict}
              {verdict === 'INVEST' && <span className="ml-2">✓</span>}
              {verdict === 'PASS' && <span className="ml-2">×</span>}
              {verdict === 'NEUTRAL' && <span className="ml-2">-</span>}
            </h1>
          </div>
          <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-gray-800 border border-gray-700">
            <span className="w-2 h-2 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
            <span className="text-sm font-medium text-gray-300">Confidence: {confidenceScore}%</span>
          </div>
        </div>

        <div className="flex flex-col items-center p-6 bg-gray-900 rounded-xl border border-gray-800">
          <p className="text-sm text-gray-400 font-medium mb-4 uppercase tracking-widest">Invest Score</p>
          <ScoreGauge score={investScore} />
        </div>

      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-emerald-500 font-semibold mb-4 flex items-center gap-2">
            <span className="p-1 bg-emerald-500/10 rounded-md">↑</span> Key Strengths
          </h3>
          <ul className="space-y-3">
            {keyStrengths.map((s, i) => (
              <li key={i} className="text-gray-300 text-sm leading-relaxed flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div>
          <h3 className="text-red-500 font-semibold mb-4 flex items-center gap-2">
            <span className="p-1 bg-red-500/10 rounded-md">↓</span> Key Risks
          </h3>
          <ul className="space-y-3">
            {keyRisks.map((s, i) => (
              <li key={i} className="text-gray-300 text-sm leading-relaxed flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

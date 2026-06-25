"use client";

import { CheckCircle2, CircleDashed, XCircle } from "lucide-react";

export interface StreamStep {
  step: string;
  detail: string;
  status: 'pending' | 'running' | 'done' | 'error';
}

export default function ThinkingStream({ steps }: { steps: StreamStep[] }) {
  if (steps.length === 0) return null;

  return (
    <div className="w-full max-w-2xl mx-auto mb-10 bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-xl">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Agent Progress</h3>
      <div className="space-y-4">
        {steps.map((s, i) => (
          <div 
            key={i} 
            className="flex items-start gap-3 transition-all duration-500 animate-fade-in"
          >
            <div className="mt-0.5">
              {s.status === 'done' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              {s.status === 'running' && <CircleDashed className="w-5 h-5 text-blue-500 animate-spin" />}
              {s.status === 'pending' && <CircleDashed className="w-5 h-5 text-gray-600" />}
              {s.status === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
            </div>
            <div>
              <p className={`font-medium ${s.status === 'pending' ? 'text-gray-500' : 'text-gray-200'}`}>
                {s.step}
              </p>
              {s.detail && (
                <p className="text-sm text-gray-500 mt-0.5">{s.detail}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

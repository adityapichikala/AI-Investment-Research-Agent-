"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

interface ResearchSectionProps {
  data: {
    businessOverview: string;
    financialHealth: string;
    competitivePosition: string;
    recentNews: string;
    growthProspects: string;
  };
  isLoading: boolean;
}

export default function ResearchSection({ data, isLoading }: ResearchSectionProps) {
  const tabs = [
    { id: "business", label: "Business", content: data.businessOverview },
    { id: "financials", label: "Financials", content: data.financialHealth },
    { id: "competitive", label: "Competitive", content: data.competitivePosition },
    { id: "news", label: "News", content: data.recentNews },
    { id: "growth", label: "Growth", content: data.growthProspects },
  ];

  const [activeTab, setActiveTab] = useState(tabs[0].id);

  const currentContent = tabs.find(t => t.id === activeTab)?.content;

  return (
    <div className="w-full max-w-4xl mx-auto bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden mt-8 shadow-xl">
      <div className="flex border-b border-gray-800 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "text-blue-500 border-b-2 border-blue-500 bg-blue-500/5"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="p-6 md:p-8 min-h-[300px]">
        {isLoading && !currentContent ? (
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-800 rounded w-3/4"></div>
            <div className="h-4 bg-gray-800 rounded w-full"></div>
            <div className="h-4 bg-gray-800 rounded w-5/6"></div>
            <div className="h-4 bg-gray-800 rounded w-full"></div>
            <div className="h-4 bg-gray-800 rounded w-2/3"></div>
          </div>
        ) : currentContent ? (
          <div className="prose prose-invert prose-blue max-w-none">
            <ReactMarkdown>{currentContent}</ReactMarkdown>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 italic">
            Waiting for research data...
          </div>
        )}
      </div>
    </div>
  );
}

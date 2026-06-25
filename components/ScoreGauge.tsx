"use client";

import { useEffect, useState } from "react";

export default function ScoreGauge({ score }: { score: number }) {
  const [fill, setFill] = useState(0);

  useEffect(() => {
    // Animate to the score
    const timer = setTimeout(() => setFill(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  // Map 0-100 to 180-0 degrees (dashoffset)
  const radius = 40;
  const circumference = radius * Math.PI; // Semicircle
  const strokeDashoffset = circumference - (fill / 100) * circumference;

  let color = "text-emerald-500";
  if (score <= 40) color = "text-red-500";
  else if (score < 60) color = "text-amber-500";

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg className="w-32 h-16 transform" viewBox="0 0 100 50">
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-gray-800"
          strokeLinecap="round"
        />
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={`${color} transition-all duration-1000 ease-out`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute bottom-0 flex flex-col items-center">
        <span className="text-2xl font-bold text-white leading-none">{Math.round(fill)}</span>
      </div>
    </div>
  );
}

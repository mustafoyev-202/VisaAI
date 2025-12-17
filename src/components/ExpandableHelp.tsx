"use client";

import { useState } from "react";

export function ExpandableHelp({ title, content }: { title: string; content: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? "Hide" : "Show"} why we ask this`}
      >
        <span>Why we ask this</span>
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="mt-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs text-slate-700 dark:text-slate-300">
          <p className="font-semibold mb-1">{title}</p>
          <p>{content}</p>
        </div>
      )}
    </div>
  );
}


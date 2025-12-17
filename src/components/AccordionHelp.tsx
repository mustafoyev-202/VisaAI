// Accordion Help Component

"use client";

import { useState } from "react";

interface AccordionHelpProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function AccordionHelp({ title, children, defaultOpen = false }: AccordionHelpProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-xl"
        aria-expanded={isOpen}
        aria-label={`${isOpen ? "Hide" : "Show"} ${title}`}
      >
        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{title}</span>
        <svg
          className={`w-5 h-5 text-slate-500 dark:text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 text-sm text-slate-600 dark:text-slate-400">
          {children}
        </div>
      )}
    </div>
  );
}


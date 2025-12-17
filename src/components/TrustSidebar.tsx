// Trust Sidebar Component

"use client";

import { AccordionHelp } from "./AccordionHelp";

export function TrustSidebar() {
  return (
    <div className="space-y-4">
      {/* What You'll Get */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
          You'll get:
        </h3>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">✓</span>
            <span><strong className="text-slate-900 dark:text-slate-100">Eligibility estimate</strong> (not final decision)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">✓</span>
            <span><strong className="text-slate-900 dark:text-slate-100">Required documents list</strong></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">✓</span>
            <span><strong className="text-slate-900 dark:text-slate-100">Risk flags</strong> (missing ties, funds, travel history)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">✓</span>
            <span><strong className="text-slate-900 dark:text-slate-100">Next steps</strong> + official links</span>
          </li>
        </ul>
      </div>

      {/* Accordions */}
      <AccordionHelp title="How we estimate this">
        <p className="text-sm leading-relaxed">
          We match your answers to official visa rules from IRCC (Canada) and USCIS (USA). 
          Our AI compares your profile against these rules to estimate eligibility and identify potential issues. 
          This is guidance only—not a final decision.
        </p>
      </AccordionHelp>

      <AccordionHelp title="We don't store your answers">
        <p className="text-sm leading-relaxed">
          Your responses are processed in real-time and never saved to our database. 
          We use your information only to generate the on-screen assessment. 
          No sign-in required, no data retention.
        </p>
      </AccordionHelp>

      <AccordionHelp title="Legal disclaimer">
        <p className="text-sm leading-relaxed">
          This assessment is for guidance only and is not legal advice. 
          Always confirm final requirements on the official immigration website 
          (<a href="https://www.canada.ca/en/immigration-refugees-citizenship.html" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">IRCC for Canada</a>, 
          <a href="https://www.uscis.gov" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline"> USCIS for USA</a>) 
          before submitting your application.
        </p>
      </AccordionHelp>
    </div>
  );
}


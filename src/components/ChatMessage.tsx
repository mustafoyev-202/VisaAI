"use client";

import { useState } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  threadId?: string;
  reactions?: { helpful: number; notHelpful: number };
  bookmarked?: boolean;
  relatedQuestions?: string[];
  richContent?: {
    type: "table" | "timeline" | "card" | "code" | "link";
    data: any;
  };
}

interface ChatMessageProps {
  message: ChatMessage;
  onReaction?: (messageId: string, reaction: "helpful" | "notHelpful") => void;
  onBookmark?: (messageId: string) => void;
  onCopy?: (content: string) => void;
  onFollowUp?: (question: string) => void;
  onSpeak?: (text: string) => void;
}

export function ChatMessageComponent({
  message,
  onReaction,
  onBookmark,
  onCopy,
  onFollowUp,
  onSpeak,
}: ChatMessageProps) {
  const [expanded, setExpanded] = useState(false);
  const [userReaction, setUserReaction] = useState<"helpful" | "notHelpful" | null>(null);

  const handleReaction = (reaction: "helpful" | "notHelpful") => {
    if (userReaction === reaction) {
      setUserReaction(null);
    } else {
      setUserReaction(reaction);
      onReaction?.(message.id, reaction);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    onCopy?.(message.content);
  };

  const handleSpeak = () => {
    onSpeak?.(message.content);
  };

  return (
    <div
      data-message-id={message.id}
      className={`flex gap-3 ${
        message.role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      {message.role === "assistant" && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/20">
          <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
      )}

      <div
        className={`group relative max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
          message.role === "user"
            ? "bg-indigo-600 text-white"
            : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
        }`}
      >
        {/* Message Content */}
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>

          {/* Rich Content */}
          {message.richContent && (
            <div className="mt-3">
              {message.richContent.type === "table" && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                      <tr>
                        {message.richContent.data.headers?.map((header: string, idx: number) => (
                          <th key={idx} className="px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {message.richContent.data.rows?.map((row: string[], idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                          {row.map((cell, cellIdx) => (
                            <td key={cellIdx} className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {message.richContent.type === "timeline" && (
                <div className="relative pl-8 border-l-2 border-indigo-200 dark:border-indigo-800">
                  {message.richContent.data.steps?.map((step: any, idx: number) => (
                    <div key={idx} className="mb-4 relative">
                      <div className="absolute -left-[21px] top-1 h-4 w-4 rounded-full bg-indigo-600 border-2 border-white dark:border-slate-800" />
                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">{step.title}</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{step.description}</p>
                        {step.duration && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-1">⏱ {step.duration}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {message.richContent.type === "card" && (
                <div className="mt-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-3">
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    {message.richContent.data.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{message.richContent.data.description}</p>
                  {message.richContent.data.expandable && (
                    <button
                      onClick={() => setExpanded(!expanded)}
                      className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {expanded ? "Show less" : "Show more"}
                    </button>
                  )}
                  {expanded && message.richContent.data.details && (
                    <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                      {message.richContent.data.details}
                    </div>
                  )}
                </div>
              )}

              {message.richContent.type === "code" && (
                <div className="mt-2 rounded-lg bg-slate-900 dark:bg-slate-950 p-3 overflow-x-auto">
                  <code className="text-xs text-emerald-400 font-mono">{message.richContent.data.code}</code>
                </div>
              )}

              {message.richContent.type === "link" && (
                <div className="mt-2">
                  <a
                    href={message.richContent.data.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    {message.richContent.data.title || "Official Resource"}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Related Questions */}
          {message.relatedQuestions && message.relatedQuestions.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Related questions:</p>
              <div className="flex flex-wrap gap-2">
                {message.relatedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => onFollowUp?.(q)}
                    className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Message Actions */}
        {message.role === "assistant" && (
          <div className="mt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Copy"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={handleSpeak}
              className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Read aloud"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </button>
            <button
              onClick={() => onBookmark?.(message.id)}
              className={`rounded p-1.5 transition-colors ${
                message.bookmarked
                  ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
              title="Bookmark"
            >
              <svg className="h-4 w-4" fill={message.bookmarked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
            <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-2">
              <button
                onClick={() => handleReaction("helpful")}
                className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
                  userReaction === "helpful"
                    ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                    : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.834a1 1 0 001.1 1h2.9a1 1 0 001-1v-5.834a1 1 0 00-1-1H7a1 1 0 00-1 1zM15.5 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM12.833 9.5a1 1 0 00-1 1v5.834a1 1 0 001 1h2.9a1 1 0 001-1v-5.834a1 1 0 00-1-1h-2.9z" />
                </svg>
                {message.reactions?.helpful || 0}
              </button>
              <button
                onClick={() => handleReaction("notHelpful")}
                className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
                  userReaction === "notHelpful"
                    ? "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                    : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.834a1 1 0 00-1-1h-2.9a1 1 0 00-1 1v5.834a1 1 0 001 1H13a1 1 0 001-1zM4.5 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM7.167 10.5a1 1 0 00-1-1h-2.9a1 1 0 00-1 1v5.834a1 1 0 001 1h2.9a1 1 0 001-1v-5.834z" />
                </svg>
                {message.reactions?.notHelpful || 0}
              </button>
            </div>
          </div>
        )}

        {/* Timestamp */}
        <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}


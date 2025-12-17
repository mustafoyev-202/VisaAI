"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { ChatMessageComponent, type ChatMessage } from "@/components/ChatMessage";
import {
  generateConversationTitle,
  generateRelatedQuestions,
  extractRichContent,
  generateConversationSummary,
  searchInConversation,
  exportConversationToText,
  exportConversationToJSON,
  type Conversation,
} from "@/lib/chatUtils";

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showRelatedQuestions, setShowRelatedQuestions] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [bookmarkedMessages, setBookmarkedMessages] = useState<Set<string>>(new Set());
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Load conversations from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("visa-ai-conversations");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConversations(parsed.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
        })));
      } catch (e) {
        console.error("Failed to load conversations", e);
      }
    }
  }, []);

  // Save conversations to localStorage
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem("visa-ai-conversations", JSON.stringify(conversations));
    }
  }, [conversations]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  async function ask(question: string, threadId?: string) {
    if (!question.trim()) return;
    setError(null);
    setLoading(true);
    setIsTyping(true);

    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      content: question,
      timestamp: new Date(),
      threadId,
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong");
      }

      const data = (await res.json()) as { answer: string };

      // Simulate typing delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const richContent = extractRichContent(data.answer);
      const relatedQuestions = generateRelatedQuestions(data.answer, "assistant");

      const assistantMessage: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: "assistant",
        content: data.answer,
        timestamp: new Date(),
        threadId: threadId || userMessage.id,
        reactions: { helpful: 0, notHelpful: 0 },
        relatedQuestions,
        richContent,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Update or create conversation
      if (currentConversationId) {
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === currentConversationId
              ? {
                  ...conv,
                  messages: [...conv.messages, userMessage, assistantMessage],
                  updatedAt: new Date(),
                }
              : conv,
          ),
        );
      } else {
        const newConv: Conversation = {
          id: Math.random().toString(36).substring(7),
          title: generateConversationTitle(question),
          messages: [userMessage, assistantMessage],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setConversations((prev) => [...prev, newConv]);
        setCurrentConversationId(newConv.id);
      }
    } catch (err) {
      console.error(err);
      setError("The assistant could not answer right now. Please try again in a moment.");
    } finally {
      setLoading(false);
      setIsTyping(false);
      setInput("");
    }
  }

  const handleReaction = (messageId: string, reaction: "helpful" | "notHelpful") => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              reactions: {
                helpful: reaction === "helpful" ? (msg.reactions?.helpful || 0) + 1 : msg.reactions?.helpful || 0,
                notHelpful: reaction === "notHelpful" ? (msg.reactions?.notHelpful || 0) + 1 : msg.reactions?.notHelpful || 0,
              },
            }
          : msg,
      ),
    );
  };

  const handleBookmark = (messageId: string) => {
    setBookmarkedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, bookmarked: !msg.bookmarked } : msg,
      ),
    );
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    setToast({ message: "Copied to clipboard!", type: "success" });
    setTimeout(() => setToast(null), 3000);
  };

  const handleFollowUp = (question: string) => {
    setInput(question);
    void ask(question);
  };

  const startNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setShowHistory(false);
  };

  const loadConversation = (convId: string) => {
    const conv = conversations.find((c) => c.id === convId);
    if (conv) {
      setMessages(conv.messages);
      setCurrentConversationId(convId);
      setShowHistory(false);
    }
  };

  const deleteConversation = (convId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (currentConversationId === convId) {
      startNewConversation();
    }
  };

  const exportConversation = (format: "text" | "json") => {
    const content = format === "text" ? exportConversationToText(messages) : exportConversationToJSON(messages);
    const blob = new Blob([content], { type: format === "text" ? "text/plain" : "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversation-${Date.now()}.${format === "text" ? "txt" : "json"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateShareLink = () => {
    const shareData = {
      conversationId: currentConversationId,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    };
    const encoded = btoa(JSON.stringify(shareData));
    const url = `${window.location.origin}/assistant?share=${encoded}`;
    navigator.clipboard.writeText(url);
    alert("Share link copied to clipboard!");
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    generateConversationSummary(conv.messages).toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const bookmarkedMessagesList = messages.filter((m) => bookmarkedMessages.has(m.id));

  const suggestedQuestions = [
    "What documents do I need for a Canada student visa?",
    "Why might my USA visitor visa be considered risky?",
    "Explain financial proof in simple words.",
    "How long does visa processing take?",
    "What should I do if my visa is rejected?",
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <NavBar />
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 rounded-lg px-4 py-3 shadow-lg animate-slide-in ${
          toast.type === "success" ? "bg-emerald-500 text-white" :
          toast.type === "error" ? "bg-red-500 text-white" :
          "bg-blue-500 text-white"
        }`}>
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}
      <main className="mx-auto flex max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {/* Conversation History Sidebar */}
        {showHistory && (
          <aside className="hidden lg:block w-80 shrink-0 space-y-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Conversations</h2>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 pl-10 text-sm"
                />
                <svg className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* New Conversation Button */}
              <button
                onClick={startNewConversation}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 mb-4"
              >
                + New Conversation
              </button>

              {/* Conversations List */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`group rounded-lg border p-3 cursor-pointer transition-colors ${
                      currentConversationId === conv.id
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                        : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                    onClick={() => loadConversation(conv.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium truncate">{conv.title}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {generateConversationSummary(conv.messages)}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                          {conv.updatedAt.toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <header className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-500 dark:text-indigo-400">
                  AI Visa Assistant
                </p>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl mt-2">
                  Ask questions about your visa
                </h1>
                <p className="max-w-2xl text-base text-slate-600 dark:text-slate-400 mt-2">
                  Get clear, simple explanations about visa requirements, documents, and processes. Not legal advice, but helpful guidance.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  {showHistory ? "Hide" : "Show"} History
                </button>
                {messages.length > 0 && (
                  <>
                    <button
                      onClick={() => exportConversation("text")}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      Export
                    </button>
                    <button
                      onClick={generateShareLink}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      Share
                    </button>
                  </>
                )}
              </div>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            {/* Chat Interface */}
            <div className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
              <div
                ref={chatContainerRef}
                className="h-[500px] space-y-4 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4"
              >
                {messages.length === 0 && (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                        Ask a question to get started
                      </p>
                    </div>
                  </div>
                )}

                {messages.map((msg) => (
                  <ChatMessageComponent
                    key={msg.id}
                    message={msg}
                    onReaction={handleReaction}
                    onBookmark={handleBookmark}
                    onCopy={handleCopy}
                    onFollowUp={handleFollowUp}
                    onSpeak={speakText}
                  />
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/20">
                      <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void ask(input);
                }}
                className="space-y-3"
              >
                <div className="relative">
                  <textarea
                    rows={3}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your question here..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 pr-24 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (input.trim() && !loading) {
                          void ask(input);
                        }
                      }
                    }}
                  />
                  <div className="absolute bottom-3 right-3 flex gap-2">
                    {isSpeaking ? (
                      <button
                        type="button"
                        onClick={stopSpeaking}
                        className="rounded-lg bg-red-100 dark:bg-red-900/20 p-2 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/30"
                        title="Stop speaking"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                        </svg>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={isListening ? stopListening : startListening}
                          className={`rounded-lg p-2 transition-colors ${
                            isListening
                              ? "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                              : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
                          }`}
                          title={isListening ? "Stop listening" : "Voice input"}
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Thinking...
                      </>
                    ) : (
                      "Send"
                    )}
                  </button>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
                    <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                  </div>
                )}
              </form>
            </div>

            {/* Sidebar */}
            <aside className="space-y-4">
              {/* Suggested Questions */}
              {showRelatedQuestions && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Suggested Questions</h3>
                    <button
                      onClick={() => setShowRelatedQuestions(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="space-y-2">
                    {suggestedQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleFollowUp(q)}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Bookmarked Messages */}
              {bookmarkedMessagesList.length > 0 && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                  <h3 className="text-sm font-semibold mb-3">Bookmarked</h3>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {bookmarkedMessagesList.map((msg) => (
                      <div
                        key={msg.id}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                        onClick={() => {
                          const element = document.querySelector(`[data-message-id="${msg.id}"]`);
                          if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                            element.classList.add("ring-2", "ring-indigo-500", "ring-offset-2");
                            setTimeout(() => {
                              element.classList.remove("ring-2", "ring-indigo-500", "ring-offset-2");
                            }, 2000);
                          }
                        }}
                      >
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                          {msg.content.substring(0, 100)}...
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <Link
                    href="/application"
                    className="block w-full rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    Run Visa Assessment
                  </Link>
                  <Link
                    href="/documents"
                    className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-center text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    View Documents
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

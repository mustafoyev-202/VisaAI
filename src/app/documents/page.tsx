"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { DocumentCard, type Document } from "@/components/DocumentCard";
import {
  checkFileSize,
  generatePreviewUrl,
  extractTextFromImage,
  detectDocumentType,
  calculateQualityScore,
  extractFields,
  checkMissingInformation,
  generateSuggestions,
} from "@/lib/documentUtils";

type FilterStatus = "all" | "pending" | "verified" | "missing" | "expired" | "processing";
type SortOption = "name" | "date" | "status" | "type";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: "1",
      name: "Passport",
      type: "Passport",
      status: "verified",
      tags: ["Required", "Identity"],
      version: 1,
      uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      expiryDate: new Date("2030-01-01"),
      qualityScore: 92,
      detectedFields: {
        "Passport Number": { value: "AB123456", confidence: 95 },
        "Expiry Date": { value: "01/01/2030", confidence: 98 },
      },
      issues: [],
      suggestions: [],
      processingTime: 2.5,
    },
    {
      id: "2",
      name: "Bank Statement",
      type: "Bank Statement",
      status: "pending",
      tags: ["Required", "Financial"],
      version: 1,
      issues: ["Balance may be insufficient"],
      suggestions: ["Ensure statement shows funds for at least 3 months"],
    },
    {
      id: "3",
      name: "Admission Letter",
      type: "Admission Letter",
      status: "missing",
      tags: ["Required", "Academic"],
      version: 0,
      issues: ["Document not uploaded"],
      suggestions: ["Upload official admission letter from institution"],
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; type: "info" | "warning" | "error" | "success" }>>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "timeline">("grid");
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get all unique tags
  const allTags = Array.from(new Set(documents.flatMap((doc) => doc.tags)));

  // Filter and sort documents
  const filteredDocs = documents
    .filter((doc) => {
      const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.type.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "all" || doc.status === filterStatus;
      const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => doc.tags.includes(tag));
      return matchesSearch && matchesStatus && matchesTags;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date":
          return (b.uploadedAt?.getTime() || 0) - (a.uploadedAt?.getTime() || 0);
        case "status":
          return a.status.localeCompare(b.status);
        case "type":
          return a.type.localeCompare(b.type);
        default:
          return a.name.localeCompare(b.name);
      }
    });

  // Calculate completion percentage
  const completionPercentage = Math.round(
    (documents.filter((d) => d.status === "verified").length / documents.length) * 100
  );

  // Add notification
  const addNotification = (message: string, type: "info" | "warning" | "error" | "success" = "info") => {
    const id = Math.random().toString(36).substring(7);
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  // Handle file upload
  const handleUpload = async (docId: string, file: File) => {
    // Check file size
    const sizeCheck = checkFileSize(file, 10);
    if (!sizeCheck.valid) {
      addNotification(sizeCheck.warning || "File too large", "error");
      return;
    }
    if (sizeCheck.warning) {
      addNotification(sizeCheck.warning, "warning");
    }

    // Generate preview
    let previewUrl: string;
    try {
      previewUrl = await generatePreviewUrl(file);
    } catch (error) {
      addNotification("Failed to generate preview", "error");
      return;
    }

    // Update document with file and preview
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === docId
          ? {
              ...doc,
              file,
              previewUrl,
              status: "processing" as const,
              uploadProgress: 0,
            }
          : doc,
      ),
    );

    addNotification(`Uploading ${file.name}...`, "info");

    // Simulate upload progress
    let progress = 0;
    const uploadInterval = setInterval(() => {
      progress += 10;
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === docId ? { ...doc, uploadProgress: progress } : doc,
        ),
      );

      if (progress >= 100) {
        clearInterval(uploadInterval);
        
        // Start processing
        processDocument(docId, file);
      }
    }, 200);
  };

  // Process document (OCR, quality check, etc.)
  const processDocument = async (docId: string, file: File) => {
    const startTime = Date.now();
    
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === docId ? { ...doc, status: "processing" as const } : doc,
      ),
    );

    try {
      // Extract text via OCR
      const ocrText = await extractTextFromImage(file);
      
      // Detect document type
      const docType = detectDocumentType(file, ocrText);
      
      // Calculate quality score
      const qualityScore = calculateQualityScore(file, ocrText);
      
      // Extract fields
      const detectedFields = extractFields(ocrText, docType);
      
      // Check for missing information
      const issues = checkMissingInformation(docType, detectedFields);
      
      // Generate suggestions
      const suggestions = generateSuggestions(docType, issues);
      
      const processingTime = (Date.now() - startTime) / 1000;

      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === docId
            ? {
                ...doc,
                type: docType,
                status: issues.length > 0 ? ("pending" as const) : ("verified" as const),
                ocrText,
                qualityScore,
                detectedFields,
                issues,
                suggestions,
                processingTime,
                uploadedAt: new Date(),
                version: (doc.version || 0) + 1,
              }
            : doc,
        ),
      );

      addNotification(
        `Document processed successfully. Quality: ${qualityScore}%`,
        issues.length > 0 ? "warning" : "success",
      );
    } catch (error) {
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === docId ? { ...doc, status: "pending" as const } : doc,
        ),
      );
      addNotification("Failed to process document", "error");
    }
  };

  // Handle document deletion
  const handleDelete = (docId: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
    setSelectedDocs((prev) => {
      const newSet = new Set(prev);
      newSet.delete(docId);
      return newSet;
    });
    addNotification("Document deleted", "success");
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    setDocuments((prev) => prev.filter((doc) => !selectedDocs.has(doc.id)));
    setSelectedDocs(new Set());
    setShowBulkActions(false);
    addNotification(`${selectedDocs.size} document(s) deleted`, "success");
  };

  // Handle bulk download (mock)
  const handleBulkDownload = () => {
    addNotification(`Preparing download for ${selectedDocs.size} document(s)...`, "info");
    // In a real app, this would trigger a download
  };

  // Handle export to PDF
  const handleExportPDF = () => {
    addNotification("Generating PDF checklist...", "info");
    // In a real app, this would generate and download a PDF
  };

  // Handle document analysis
  const handleAnalyze = async (docId: string) => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc || !doc.file) {
      addNotification("Please upload a file first", "error");
      return;
    }

    const startTime = Date.now();

    // Set analyzing state
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === docId ? { ...d, status: "processing" as const } : d,
      ),
    );

    addNotification("Extracting text from document...", "info");

    try {
      // Step 1: Extract text via OCR
      const ocrText = await extractTextFromImage(doc.file);
      
      // Step 2: Detect document type
      const docType = detectDocumentType(doc.file, ocrText);
      
      addNotification("Analyzing with AI...", "info");

      // Step 3: Call the analyze API
      const response = await fetch("/api/analyze-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationCountry: "canada", // Default, could be from user context
          visaType: "student", // Default, could be from user context
          documents: [
            {
              name: doc.name,
              typeHint: docType,
              textContent: ocrText,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Analysis failed");
      }

      const analysisResults = await response.json();
      const result = Array.isArray(analysisResults) ? analysisResults[0] : analysisResults;

      // Step 4: Calculate quality score
      const qualityScore = calculateQualityScore(doc.file, ocrText);
      
      // Step 5: Extract fields
      const detectedFields = extractFields(ocrText, docType);
      
      // Step 6: Check for missing information
      const issues = result.issues || checkMissingInformation(docType, detectedFields);
      
      // Step 7: Generate suggestions
      const suggestions = result.suggestions || generateSuggestions(docType, issues);

      const processingTime = (Date.now() - startTime) / 1000;

      // Update document with analysis results
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === docId
            ? {
                ...d,
                status: issues.length > 0 ? ("pending" as const) : ("verified" as const),
                type: result.inferredType || docType,
                ocrText,
                qualityScore,
                detectedFields,
                issues: Array.isArray(issues) ? issues : [],
                suggestions: Array.isArray(suggestions) ? suggestions : [],
                processingTime,
              }
            : d,
        ),
      );

      addNotification(
        `✅ Analysis complete! Found ${issues.length} issue(s) and ${suggestions.length} suggestion(s).`,
        issues.length > 0 ? "warning" : "success",
      );
    } catch (error) {
      console.error("Analysis error:", error);
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === docId ? { ...d, status: "pending" as const } : d,
        ),
      );
      addNotification(
        `Failed to analyze document: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error",
      );
    }
  };

  // Toggle tag filter
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  // Toggle document selection
  const toggleSelection = (docId: string, selected: boolean) => {
    setSelectedDocs((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(docId);
      } else {
        newSet.delete(docId);
      }
      setShowBulkActions(newSet.size > 0);
      return newSet;
    });
  };

  // Select all visible documents
  const selectAll = () => {
    const allIds = new Set(filteredDocs.map((d) => d.id));
    setSelectedDocs(allIds);
    setShowBulkActions(true);
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedDocs(new Set());
    setShowBulkActions(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <NavBar />
      
      {/* Notifications */}
      <div className="fixed top-20 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`rounded-lg border px-4 py-3 shadow-lg animate-slide-in ${
              notification.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                : notification.type === "error"
                  ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
                  : notification.type === "warning"
                    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200"
                    : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200"
            }`}
            role="alert"
            aria-live="polite"
          >
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
        ))}
      </div>

      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <header className="space-y-6">
          <div className="relative overflow-hidden rounded-3xl border-2 border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 p-8 shadow-xl">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-2xl shadow-lg">
                    📄
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-600 dark:text-indigo-400">
                      Documents workspace
                    </p>
                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mt-1 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      Manage your visa documents
                    </h1>
                  </div>
                </div>
                <p className="max-w-2xl text-base text-slate-700 dark:text-slate-300 mt-3">
                  Upload, organize, and verify your documents. Our AI will check quality, extract information, and flag potential issues.
                </p>
                <div className="mt-4 flex items-center gap-2 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3 shadow-sm">
                  <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                    🔒 Secure: Files are encrypted and automatically deleted after 24 hours
                  </p>
                </div>
              </div>
              
              {/* Completion Progress Ring */}
              <div className="hidden md:flex flex-col items-center">
                <div className="relative w-32 h-32">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="10"
                      fill="none"
                      className="text-slate-200 dark:text-slate-700"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="10"
                      fill="none"
                      strokeDasharray={`${completionPercentage * 3.52} 352`}
                      className="text-emerald-600 transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-emerald-600">{completionPercentage}%</span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Complete</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search, Filter, and Sort Bar */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 pl-10 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <svg
                  className="absolute left-3 top-2.5 h-5 w-5 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Status</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="missing">Missing</option>
                <option value="expired">Expired</option>
                <option value="processing">Processing</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="name">Sort by Name</option>
                <option value="date">Sort by Date</option>
                <option value="status">Sort by Status</option>
                <option value="type">Sort by Type</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "grid"
                    ? "bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
                aria-label="Grid view"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "list"
                    ? "bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
                aria-label="List view"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("timeline")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "timeline"
                    ? "bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
                aria-label="Timeline view"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tag Filters */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Filter by tags:</span>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    selectedTags.includes(tag)
                      ? "bg-indigo-600 text-white"
                      : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Bulk Actions Bar */}
          {showBulkActions && (
            <div className="flex items-center justify-between rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                  {selectedDocs.size} document(s) selected
                </span>
                <button
                  onClick={deselectAll}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Deselect all
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleBulkDownload}
                  className="rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                >
                  Download Selected
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                >
                  Delete Selected
                </button>
              </div>
            </div>
          )}
        </header>

        {/* Documents Grid/List */}
        <section>
          {viewMode === "timeline" ? (
            <TimelineView
              documents={filteredDocs}
              onUpload={handleUpload}
              onDelete={handleDelete}
              onAnalyze={handleAnalyze}
              selectedDocs={selectedDocs}
              onSelect={toggleSelection}
            />
          ) : viewMode === "list" ? (
            <ListView
              documents={filteredDocs}
              onUpload={handleUpload}
              onDelete={handleDelete}
              onAnalyze={handleAnalyze}
              selectedDocs={selectedDocs}
              onSelect={toggleSelection}
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredDocs.map((doc) => (
                <EnhancedDocumentCard
                  key={doc.id}
                  document={doc}
                  onUpload={(file) => handleUpload(doc.id, file)}
                  onDelete={() => handleDelete(doc.id)}
                  onAnalyze={() => handleAnalyze(doc.id)}
                  isSelected={selectedDocs.has(doc.id)}
                  onSelect={(selected) => toggleSelection(doc.id, selected)}
                />
              ))}
            </div>
          )}

          {filteredDocs.length === 0 && (
            <div className="rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 p-16 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-6">
                <svg className="h-10 w-10 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">No documents found</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                Try adjusting your search or filters to find what you're looking for
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Upload Documents
              </button>
            </div>
          )}
        </section>

        {/* Action Buttons */}
        <section className="flex flex-wrap gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload Multiple Files
          </button>
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Checklist to PDF
          </button>
          <Link
            href="/application"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Run Visa Eligibility Check
          </Link>
        </section>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            files.forEach((file) => {
              // Find first missing document or create new one
              const missingDoc = documents.find((d) => d.status === "missing");
              if (missingDoc) {
                handleUpload(missingDoc.id, file);
              }
            });
          }}
        />
      </main>
    </div>
  );
}

// Enhanced Document Card with exciting UI
function EnhancedDocumentCard({
  document,
  onUpload,
  onDelete,
  onAnalyze,
  isSelected = false,
  onSelect,
}: {
  document: Document;
  onUpload: (file: File) => void;
  onDelete: () => void;
  onAnalyze: () => void;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const statusConfig = {
    pending: {
      gradient: "from-amber-500 to-orange-500",
      bgGradient: "from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20",
      borderColor: "border-amber-200 dark:border-amber-800",
      icon: "⚠️",
      textColor: "text-amber-700 dark:text-amber-300",
    },
    verified: {
      gradient: "from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20",
      borderColor: "border-emerald-200 dark:border-emerald-800",
      icon: "✅",
      textColor: "text-emerald-700 dark:text-emerald-300",
    },
    missing: {
      gradient: "from-rose-500 to-pink-500",
      bgGradient: "from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20",
      borderColor: "border-rose-200 dark:border-rose-800",
      icon: "🚨",
      textColor: "text-rose-700 dark:text-rose-300",
    },
    expired: {
      gradient: "from-red-500 to-rose-500",
      bgGradient: "from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20",
      borderColor: "border-red-200 dark:border-red-800",
      icon: "⏰",
      textColor: "text-red-700 dark:text-red-300",
    },
    processing: {
      gradient: "from-indigo-500 to-purple-500",
      bgGradient: "from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20",
      borderColor: "border-indigo-200 dark:border-indigo-800",
      icon: "⚙️",
      textColor: "text-indigo-700 dark:text-indigo-300",
    },
  };

  const config = statusConfig[document.status];

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) onUpload(file);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => !document.file && fileInputRef.current?.click()}
      className={`group relative overflow-hidden rounded-3xl border-2 transition-all duration-300 cursor-pointer ${
        isDragging
          ? `border-indigo-500 bg-gradient-to-br ${config.bgGradient} scale-105 shadow-2xl`
          : isSelected
            ? `border-indigo-400 ring-4 ring-indigo-200 dark:ring-indigo-800 bg-gradient-to-br ${config.bgGradient} shadow-xl`
            : `${config.borderColor} bg-gradient-to-br ${config.bgGradient} hover:shadow-xl hover:scale-[1.02]`
      }`}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      {/* Selection Checkbox */}
      {onSelect && (
        <div className="absolute top-4 right-4 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect?.(e.target.checked);
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-5 w-5 rounded border-2 border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          />
        </div>
      )}

      {/* Processing Indicator */}
      {document.status === "processing" && (
        <div className="absolute top-4 left-4 z-10">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-slate-200 dark:text-slate-700"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeDasharray="175.9 175.9"
                className="text-indigo-600 animate-spin"
                style={{ strokeDashoffset: "87.96" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg">{config.icon}</span>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
        }}
      />

      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${config.gradient} text-2xl shadow-lg`}>
                {config.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                  {document.name}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  {document.type}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        {document.previewUrl ? (
          <div className="relative mb-4 h-48 overflow-hidden rounded-2xl border-2 border-white/50 dark:border-slate-700/50 shadow-lg">
            <img
              src={document.previewUrl}
              alt={document.name}
              className="h-full w-full object-cover"
            />
            {document.status === "processing" && (
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/80 to-purple-500/80 flex items-center justify-center backdrop-blur-sm">
                <div className="text-center">
                  <div className="text-3xl mb-2 animate-pulse">⚙️</div>
                  <div className="text-white text-sm font-semibold">Processing...</div>
                </div>
              </div>
            )}
            {document.qualityScore !== undefined && (
              <div className="absolute top-2 right-2 rounded-full bg-white/90 dark:bg-slate-800/90 px-3 py-1 shadow-lg">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Quality: {document.qualityScore}%
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="mb-4 flex h-48 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white/50 dark:bg-slate-800/50">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {isDragging ? "Drop file here" : "Click or drag to upload"}
              </p>
            </div>
          </div>
        )}

        {/* Tags */}
        {document.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {document.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-white/80 dark:bg-slate-800/80 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Detected Fields */}
        {document.detectedFields && Object.keys(document.detectedFields).length > 0 && (
          <div className="mb-4 rounded-xl bg-white/60 dark:bg-slate-800/60 p-3 backdrop-blur-sm">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
              Detected Information
            </p>
            <div className="space-y-1.5">
              {Object.entries(document.detectedFields).slice(0, 3).map(([key, field]) => (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">{key}:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{field.value}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      field.confidence >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" :
                      field.confidence >= 60 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" :
                      "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                    }`}>
                      {field.confidence}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Issues & Suggestions */}
        {(document.issues.length > 0 || document.suggestions.length > 0) && (
          <div className="mb-4 space-y-2">
            {document.issues.length > 0 && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
                <p className="text-xs font-bold text-amber-800 dark:text-amber-200 mb-1.5 flex items-center gap-1.5">
                  <span>⚠️</span>
                  Issues ({document.issues.length})
                </p>
                <ul className="space-y-1">
                  {document.issues.slice(0, 2).map((issue, idx) => (
                    <li key={idx} className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                      <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                      <span>{issue}</span>
                    </li>
                  ))}
                  {document.issues.length > 2 && (
                    <li className="text-xs text-amber-600 dark:text-amber-400">
                      +{document.issues.length - 2} more
                    </li>
                  )}
                </ul>
              </div>
            )}
            {document.suggestions.length > 0 && (
              <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
                <p className="text-xs font-bold text-blue-800 dark:text-blue-200 mb-1.5 flex items-center gap-1.5">
                  <span>💡</span>
                  Suggestions ({document.suggestions.length})
                </p>
                <ul className="space-y-1">
                  {document.suggestions.slice(0, 2).map((suggestion, idx) => (
                    <li key={idx} className="text-xs text-blue-700 dark:text-blue-300 flex items-start gap-1.5">
                      <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                      <span>{suggestion}</span>
                    </li>
                  ))}
                  {document.suggestions.length > 2 && (
                    <li className="text-xs text-blue-600 dark:text-blue-400">
                      +{document.suggestions.length - 2} more
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {document.file ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAnalyze();
                }}
                disabled={document.status === "processing"}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all ${
                  document.status === "processing"
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl"
                }`}
              >
                {document.status === "processing" ? "Analyzing..." : "🔍 Analyze"}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Delete
              </button>
            </>
          ) : (
            <div className="w-full text-center py-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click to upload document
              </p>
            </div>
          )}
        </div>

        {/* Processing Time */}
        {document.processingTime && (
          <div className="mt-3 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Processed in {document.processingTime.toFixed(1)}s
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Timeline View Component
function TimelineView({
  documents,
  onUpload,
  onDelete,
  onAnalyze,
  selectedDocs,
  onSelect,
}: {
  documents: Document[];
  onUpload: (docId: string, file: File) => void;
  onDelete: (docId: string) => void;
  onAnalyze: (docId: string) => void;
  selectedDocs: Set<string>;
  onSelect: (docId: string, selected: boolean) => void;
}) {
  return (
    <div className="relative">
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
      <div className="space-y-6">
        {documents.map((doc, index) => (
          <div key={doc.id} className="relative flex gap-4">
            <div className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
              {index + 1}
            </div>
            <div className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{doc.name}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      doc.status === "verified" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300" :
                      doc.status === "pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300" :
                      doc.status === "missing" ? "bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300" :
                      "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                    }`}>
                      {doc.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{doc.type}</p>
                  {doc.uploadedAt && (
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      Uploaded {doc.uploadedAt.toLocaleDateString()} • Processing time: {doc.processingTime?.toFixed(1)}s
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {doc.file && (
                    <button
                      onClick={() => onAnalyze(doc.id)}
                      className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                    >
                      Analyze
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(doc.id)}
                    className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// List View Component
function ListView({
  documents,
  onUpload,
  onDelete,
  onAnalyze,
  selectedDocs,
  onSelect,
}: {
  documents: Document[];
  onUpload: (docId: string, file: File) => void;
  onDelete: (docId: string) => void;
  onAnalyze: (docId: string) => void;
  selectedDocs: Set<string>;
  onSelect: (docId: string, selected: boolean) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-50 dark:bg-slate-900/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input type="checkbox" className="rounded border-slate-300" />
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Document</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Type</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Quality</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Expiry</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {documents.map((doc) => (
            <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedDocs.has(doc.id)}
                  onChange={(e) => onSelect(doc.id, e.target.checked)}
                  className="rounded border-slate-300"
                />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {doc.previewUrl && (
                    <img src={doc.previewUrl} alt={doc.name} className="h-10 w-10 rounded object-cover" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{doc.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {doc.uploadedAt?.toLocaleDateString() || "Not uploaded"}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{doc.type}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                  doc.status === "verified" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300" :
                  doc.status === "pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300" :
                  doc.status === "missing" ? "bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300" :
                  "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                }`}>
                  {doc.status}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                {doc.qualityScore ? `${doc.qualityScore}%` : "-"}
              </td>
              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                {doc.expiryDate?.toLocaleDateString() || "-"}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  {doc.file && (
                    <button
                      onClick={() => onAnalyze(doc.id)}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Analyze
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(doc.id)}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

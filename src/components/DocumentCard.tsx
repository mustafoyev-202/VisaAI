"use client";

import { useState, useRef, useEffect } from "react";

export interface Document {
  id: string;
  name: string;
  type: string;
  status: "pending" | "verified" | "missing" | "expired" | "processing";
  file?: File;
  previewUrl?: string;
  uploadProgress?: number;
  expiryDate?: Date;
  tags: string[];
  version: number;
  uploadedAt?: Date;
  ocrText?: string;
  qualityScore?: number;
  detectedFields?: Record<string, { value: string; confidence: number }>;
  issues: string[];
  suggestions: string[];
  processingTime?: number;
}

interface DocumentCardProps {
  document: Document;
  onUpload: (file: File) => void;
  onDelete: () => void;
  onAnalyze: () => void;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
}

export function DocumentCard({
  document,
  onUpload,
  onDelete,
  onAnalyze,
  isSelected = false,
  onSelect,
}: DocumentCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const statusColors = {
    pending: "border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300",
    verified: "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300",
    missing: "border-rose-300 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300",
    expired: "border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300",
    processing: "border-blue-300 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300",
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      onUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  const progressPercentage = document.uploadProgress || 0;
  const completionPercentage = document.status === "verified" ? 100 : document.status === "processing" ? 50 : 0;

  return (
    <div
      ref={dropZoneRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => !document.file && fileInputRef.current?.click()}
      className={`group relative rounded-2xl border-2 bg-white dark:bg-slate-800 p-4 shadow-lg transition-all cursor-pointer ${
        isDragging
          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 scale-105 shadow-xl"
          : isSelected
            ? "border-indigo-400 ring-2 ring-indigo-200 dark:ring-indigo-800"
            : statusColors[document.status]
      }`}
    >
      {/* Selection checkbox */}
      {onSelect && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect?.(e.target.checked);
          }}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-3 right-3 h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
        />
      )}

      {/* Progress Ring */}
      {document.status === "processing" && (
        <div className="absolute top-4 right-4">
          <svg className="w-12 h-12 transform -rotate-90">
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              className="text-slate-200 dark:text-slate-700"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              strokeDasharray={`${completionPercentage * 1.256} 125.6`}
              className="text-indigo-600 transition-all duration-300"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-indigo-600">
            {completionPercentage}%
          </span>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple={false}
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Document Preview */}
      {document.previewUrl ? (
        <div className="relative mb-3 h-32 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          <img
            src={document.previewUrl}
            alt={document.name}
            className="h-full w-full object-cover"
          />
          {document.status === "processing" && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-white text-xs font-semibold">Processing...</div>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-3 flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50">
          <div className="text-center">
            <svg className="mx-auto h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {isDragging ? "Drop file here" : "Drop or click to upload"}
            </p>
          </div>
        </div>
      )}

      {/* Upload Progress Bar */}
      {document.uploadProgress !== undefined && document.uploadProgress < 100 && (
        <div className="mb-3">
          <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Uploading... {progressPercentage}%
          </p>
        </div>
      )}

      {/* Document Info */}
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {document.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {document.type}
            </p>
          </div>
        </div>

        {/* Tags */}
        {document.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {document.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-300"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${
              statusColors[document.status]
            }`}
          >
            {document.status === "processing" && (
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-current" />
            )}
            {document.status === "verified" && (
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {document.status}
          </span>

          {/* Quality Score */}
          {document.qualityScore !== undefined && (
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Quality: {document.qualityScore}%
            </span>
          )}
        </div>

        {/* Expiry Date */}
        {document.expiryDate && (
          <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Expires: {document.expiryDate.toLocaleDateString()}
          </div>
        )}

        {/* OCR Preview */}
        {document.ocrText && (
          <div className="mt-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 p-2">
            <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Extracted Text Preview:
            </p>
            <p className="text-[10px] text-slate-600 dark:text-slate-400 line-clamp-2">
              {document.ocrText.substring(0, 100)}...
            </p>
          </div>
        )}

        {/* Detected Fields */}
        {document.detectedFields && Object.keys(document.detectedFields).length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">
              Detected Fields:
            </p>
            {Object.entries(document.detectedFields).slice(0, 2).map(([key, field]) => (
              <div key={key} className="flex items-center justify-between text-[10px]">
                <span className="text-slate-600 dark:text-slate-400">{key}:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {field.value}
                </span>
                <span className="text-slate-500 dark:text-slate-500">
                  ({field.confidence}%)
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Issues & Suggestions */}
        {document.issues.length > 0 && (
          <div className="mt-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-2">
            <p className="text-[10px] font-semibold text-amber-800 dark:text-amber-200 mb-1">
              Issues Found:
            </p>
            <ul className="space-y-0.5">
              {document.issues.slice(0, 2).map((issue, idx) => (
                <li key={idx} className="text-[10px] text-amber-700 dark:text-amber-300">
                  • {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          {document.file && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAnalyze();
                }}
                className="flex-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                Analyze
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


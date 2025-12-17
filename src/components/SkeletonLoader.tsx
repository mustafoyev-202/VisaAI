"use client";

export function SkeletonLoader() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full" />
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6" />
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded-lg" />
      </div>
      <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-lg mt-4" />
    </div>
  );
}


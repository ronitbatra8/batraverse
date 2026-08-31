"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function OwnerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Owner panel crashed:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-dark-900 border border-red-500/30 rounded-2xl p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <h1 className="text-xl font-semibold text-white mb-2">Owner panel error</h1>
        <p className="text-sm text-zinc-400 mb-4">
          Something went wrong while loading this view. Your session and owner key are still valid.
        </p>
        <pre className="text-left text-xs text-red-300 bg-dark-950 border border-dark-800 rounded-lg p-3 mb-5 overflow-x-auto whitespace-pre-wrap break-all">
          {error.message || "Unknown error"}
          {"\n\n"}{error.digest ? `digest: ${error.digest}` : ""}
          {"\n\n"}{error.stack || ""}
        </pre>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            Try again
          </button>
          <Link
            href="/owner"
            className="px-4 py-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-zinc-300 text-sm font-medium transition-colors"
          >
            Back to key entry
          </Link>
        </div>
      </div>
    </div>
  );
}

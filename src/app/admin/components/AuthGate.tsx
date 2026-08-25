"use client";

import { Shield, Eye, EyeOff } from "lucide-react";

export default function AuthGate({ adminKey, setAdminKey, showKey, setShowKey, loading, onSubmit, authError }: {
  adminKey: string;
  setAdminKey: (v: string) => void;
  showKey: boolean;
  setShowKey: (v: boolean) => void;
  loading: boolean;
  onSubmit: () => void;
  authError?: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-24 pb-12 page-transition">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gold-500/10 border border-gold-500/20 mb-4">
            <Shield size={36} className="text-gold-400" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white">Owner Panel</h1>
          <p className="text-dark-400 text-sm mt-2">Enter your owner key to access the dashboard</p>
        </div>
        <div className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-8">
          <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-5">
            <div className="relative">
              <input type={showKey ? "text" : "password"} value={adminKey} onChange={(e) => setAdminKey(e.target.value)} placeholder="Owner key" required autoComplete="new-password"
                className="w-full bg-dark-800 border border-dark-700 rounded-xl pl-4 pr-11 py-3.5 text-sm text-white placeholder:text-dark-500 focus:outline-none focus:border-gold-500 transition-colors" />
              <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors">
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {authError && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{authError}</p>}
            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-dark-950 py-4 rounded-xl font-semibold transition-all hover:shadow-lg hover:shadow-gold-500/20 disabled:opacity-50">
              {loading ? "Connecting..." : "Access Dashboard"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

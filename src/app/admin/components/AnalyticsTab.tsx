/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Globe, Calendar, TrendingUp, Clock, ExternalLink } from "lucide-react";

export default function AnalyticsTab({
  analytics,
}: {
  analytics: any;
}) {
  if (!analytics) return null;

  const maxVisits = Math.max(...(analytics.dailyLast7?.map((d: any) => d.visits) || [1]), 1);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif text-white">Analytics</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-gold-500/10 to-gold-500/5 border border-gold-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <Globe size={20} className="text-gold-400" />
          </div>
          <p className="text-2xl font-display font-bold text-white">{analytics.today?.visits ?? 0}</p>
          <p className="text-xs text-dark-400 mt-1">Today</p>
          <p className="text-[10px] text-dark-500 mt-0.5">{analytics.today?.unique ?? 0} unique</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <Calendar size={20} className="text-blue-400" />
          </div>
          <p className="text-2xl font-display font-bold text-white">{analytics.week?.visits ?? 0}</p>
          <p className="text-xs text-dark-400 mt-1">Last 7 Days</p>
          <p className="text-[10px] text-dark-500 mt-0.5">{analytics.week?.unique ?? 0} unique</p>
        </div>
        <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp size={20} className="text-green-400" />
          </div>
          <p className="text-2xl font-display font-bold text-white">{analytics.overall?.visits ?? 0}</p>
          <p className="text-xs text-dark-400 mt-1">All Time</p>
          <p className="text-[10px] text-dark-500 mt-0.5">{analytics.overall?.unique ?? 0} unique</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <Clock size={20} className="text-purple-400" />
          </div>
          <p className="text-2xl font-display font-bold text-white">
            {analytics.avgDuration != null ? `${Math.round(analytics.avgDuration)}s` : "—"}
          </p>
          <p className="text-xs text-dark-400 mt-1">Avg Session</p>
        </div>
      </div>

      <div className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-6">
        <h3 className="text-sm font-display font-bold text-white mb-5">Daily Visits (Last 7 Days)</h3>
        <div className="h-48 flex items-end gap-2">
          {(analytics.dailyLast7 || []).map((day: any, i: number) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-[10px] text-dark-400">{day.visits}</span>
              <div
                className="w-full bg-gradient-to-t from-gold-500/80 to-gold-400/40 rounded-t-lg transition-all"
                style={{ height: `${Math.max((day.visits / maxVisits) * 100, 4)}%` }}
              />
              <span className="text-[10px] text-dark-500">{day.label}</span>
            </div>
          ))}
          {(!analytics.dailyLast7 || analytics.dailyLast7.length === 0) && (
            <div className="w-full h-full flex items-center justify-center text-dark-600 text-sm">
              No visit data yet
            </div>
          )}
        </div>
      </div>

      <div className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-6">
        <h3 className="text-sm font-display font-bold text-white mb-4">Top Pages</h3>
        {(!analytics.topPages || analytics.topPages.length === 0) ? (
          <div className="py-8 text-center text-dark-500 text-sm">No page data yet</div>
        ) : (
          <div className="space-y-3">
            {analytics.topPages.map((page: any, i: number) => {
              const maxPageVisits = analytics.topPages[0]?.visits || 1;
              const isExternal = page.page.startsWith("http");
              const href = isExternal ? page.page : `${window.location.origin}${page.page}`;
              return (
                <div
                  key={i}
                  className="flex items-center gap-4 cursor-pointer hover:bg-dark-800/20 -mx-2 px-2 py-1.5 rounded-lg transition-colors group"
                  onClick={() => window.open(href, "_blank")}
                >
                  <span className="text-xs text-dark-500 w-5 text-right shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white truncate group-hover:text-gold-400 transition-colors flex items-center gap-1.5">
                        {page.page}
                        <ExternalLink size={11} className="text-dark-600 group-hover:text-gold-400 shrink-0" />
                      </span>
                      <span className="text-xs text-dark-400 shrink-0 ml-3">{page.visits} visits</span>
                    </div>
                    <div className="h-1.5 bg-dark-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gold-500/60 rounded-full"
                        style={{ width: `${(page.visits / maxPageVisits) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

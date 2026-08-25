"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Send,
  ArrowLeft,
  Inbox,
  Hourglass,
  Loader,
  ShieldCheck,
} from "lucide-react";
import { useLight } from "@/components/auth/auth-ui";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/components/auth/AuthContext";
import SiteLayout from "@/components/layout/SiteLayout";

interface QueryMessage {
  id: string;
  name: string;
  email: string;
  altEmail?: string | null;
  subject: string;
  message: string;
  status: string;
  read: boolean;
  replyMessage: string | null;
  repliedAt: string | null;
  createdAt: string;
}

const STEPS = [
  { key: "submitted", label: "Submitted", icon: Send },
  { key: "pending", label: "Pending Review", icon: Hourglass },
  { key: "in-progress", label: "In Progress", icon: Loader },
  { key: "replied", label: "Replied", icon: CheckCircle2 },
] as const;

const STATUS_ORDER: Record<string, number> = {
  submitted: 0,
  pending: 1,
  "in-progress": 2,
  replied: 3,
  resolved: 3,
};

const STATUS_BADGE: Record<
  string,
  { label: string; dot: string; bg: string; text: string; border: string }
> = {
  pending: {
    label: "Pending",
    dot: "bg-amber-400",
    bg: "bg-amber-400/10",
    text: "text-amber-600",
    border: "border-amber-400/20",
  },
  "in-progress": {
    label: "In Progress",
    dot: "bg-sky-400",
    bg: "bg-sky-400/10",
    text: "text-sky-600",
    border: "border-sky-400/20",
  },
  replied: {
    label: "Replied",
    dot: "bg-emerald-400",
    bg: "bg-emerald-400/10",
    text: "text-emerald-600",
    border: "border-emerald-400/20",
  },
  resolved: {
    label: "Resolved",
    dot: "bg-violet-400",
    bg: "bg-violet-400/10",
    text: "text-violet-600",
    border: "border-violet-400/20",
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStepState(stepIndex: number, status: string) {
  const currentIdx = STATUS_ORDER[status] ?? 0;
  if (status === "resolved") return "completed";
  if (stepIndex < currentIdx) return "completed";
  if (stepIndex === currentIdx) return "current";
  return "pending";
}

function Stepper({ msg, light }: { msg: QueryMessage; light: boolean }) {
  return (
    <div className="relative ml-1 mt-1">
      {STEPS.map((step, i) => {
        const state = getStepState(i, msg.status);
        const Icon = step.icon;
        const isLast = i === STEPS.length - 1;

        const stepDate =
          state === "completed"
            ? i === 0
              ? msg.createdAt
              : i === 3 && (msg.status === "replied" || msg.status === "resolved")
              ? msg.repliedAt
              : null
            : null;

        return (
          <div key={step.key} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                  state === "completed" &&
                    "border-emerald-500 bg-emerald-500 text-white",
                  state === "current" &&
                    light
                      ? "border-sapphire bg-sapphire/10 text-sapphire"
                      : "border-gold bg-gold/10 text-gold-light",
                  state === "pending" &&
                    cn(
                      "border-gray-300 bg-transparent",
                      light ? "text-onyx/30" : "text-cream/20"
                    )
                )}
              >
                {state === "completed" ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <Icon size={14} />
                )}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "w-0.5 flex-1 min-h-[2rem]",
                    state === "completed" ? "bg-emerald-400" : "bg-gray-200",
                    state === "completed" && !light && "bg-emerald-600/50",
                    state !== "completed" && !light && "bg-white/10"
                  )}
                />
              )}
            </div>

            <div className={cn("pb-6", isLast && "pb-0")}>
              <p
                className={cn(
                  "text-sm font-medium",
                  state === "completed" && "text-emerald-600",
                  state === "completed" && !light && "text-emerald-400",
                  state === "current" && light && "text-sapphire font-semibold",
                  state === "current" && !light && "text-gold-light font-semibold",
                  state === "pending" && light && "text-onyx/40",
                  state === "pending" && !light && "text-cream/25"
                )}
              >
                {step.label}
              </p>
              {state === "completed" && stepDate && (
                <p
                  className={cn(
                    "text-xs mt-0.5",
                    light ? "text-onyx/40" : "text-cream/30"
                  )}
                >
                  {formatDateTime(stepDate)}
                </p>
              )}
              {state === "current" && (
                <p
                  className={cn(
                    "text-xs mt-0.5 italic",
                    light ? "text-onyx/40" : "text-cream/30"
                  )}
                >
                  Current step
                </p>
              )}
              {state === "pending" && (
                <p
                  className={cn(
                    "text-xs mt-0.5",
                    light ? "text-onyx/25" : "text-cream/15"
                  )}
                >
                  Awaiting
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function QueriesPage() {
  const light = useLight();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<QueryMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const data = await apiFetch("/messages/my");
        setMessages(data.messages || []);
      } catch {
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <SiteLayout>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <Loader2
            className="w-8 h-8 animate-spin"
            style={{ color: light ? "#1e3a8a" : "#d4af37" }}
          />
        </div>
      </SiteLayout>
    );
  }

  if (!user) return null;

  const totalCount = messages.length;
  const pendingCount = messages.filter((m) => m.status === "pending").length;
  const inProgressCount = messages.filter((m) => m.status === "in-progress").length;
  const resolvedCount = messages.filter(
    (m) => m.status === "replied" || m.status === "resolved"
  ).length;

  const stats = [
    {
      label: "Total",
      value: totalCount,
      icon: Inbox,
      accent: light ? "text-sapphire" : "text-gold-light",
      iconBg: light ? "bg-sapphire/10" : "bg-gold/10",
    },
    {
      label: "Pending",
      value: pendingCount,
      icon: Clock,
      accent: "text-amber-500",
      iconBg: "bg-amber-500/10",
    },
    {
      label: "In Progress",
      value: inProgressCount,
      icon: Loader,
      accent: "text-sky-500",
      iconBg: "bg-sky-500/10",
    },
    {
      label: "Resolved",
      value: resolvedCount,
      icon: CheckCircle2,
      accent: "text-emerald-500",
      iconBg: "bg-emerald-500/10",
    },
  ];

  return (
    <SiteLayout>
      <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden px-6 pb-20 pt-24 sm:px-10 sm:pt-28">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[40rem] w-[70rem] -translate-x-1/2 -translate-y-1/3 rounded-full blur-3xl"
          style={{
            background: light
              ? "radial-gradient(closest-side, rgba(30,58,138,0.06), transparent)"
              : "radial-gradient(closest-side, rgba(212,175,55,0.08), transparent)",
          }}
        />

        <div className="relative z-10 mx-auto max-w-3xl space-y-8">
          {/* Header */}
          <div>
            <button
              onClick={() => router.back()}
              className={cn(
                "flex items-center gap-1.5 text-xs mb-4 transition-colors",
                light
                  ? "text-onyx/50 hover:text-sapphire"
                  : "text-cream/50 hover:text-gold-light"
              )}
            >
              <ArrowLeft size={14} />
              Back
            </button>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                    light ? "bg-sapphire/10 text-sapphire" : "bg-gold/10 text-gold-light"
                  )}
                >
                  <MessageSquare size={22} strokeWidth={1.5} />
                </span>
                <div>
                  <h1
                    className={cn(
                      "text-2xl font-bold tracking-tight",
                      light ? "text-onyx" : "text-white"
                    )}
                  >
                    My Queries
                  </h1>
                  <p
                    className={cn(
                      "text-xs tracking-wider mt-0.5",
                      light ? "text-onyx/45" : "text-cream/40"
                    )}
                  >
                    Track and manage your support requests
                  </p>
                </div>
              </div>

              <Link
                href="/contact"
                className={cn(
                  "hidden sm:inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] px-5 py-2.5 rounded-full transition-all",
                  light
                    ? "bg-sapphire text-white hover:shadow-[0_0_30px_rgba(30,58,138,0.25)]"
                    : "bg-gold text-abyss hover:shadow-[0_0_30px_rgba(212,175,55,0.25)]"
                )}
              >
                <Send size={12} />
                New Query
              </Link>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className={cn(
                    "rounded-2xl border p-4 sm:p-5",
                    light
                      ? "border-onyx/8 bg-white"
                      : "border-white/8 bg-white/[0.02]"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        s.iconBg
                      )}
                    >
                      <Icon size={15} className={s.accent} strokeWidth={2} />
                    </span>
                  </div>
                  <p className={cn("text-2xl font-bold", s.accent)}>
                    {s.value}
                  </p>
                  <p
                    className={cn(
                      "text-[10px] uppercase tracking-[0.2em] mt-1",
                      light ? "text-onyx/40" : "text-cream/35"
                    )}
                  >
                    {s.label}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Query cards */}
          {messages.length === 0 ? (
            <div
              className={cn(
                "rounded-3xl border p-16 text-center",
                light
                  ? "border-onyx/8 bg-white"
                  : "border-white/8 bg-white/[0.02]"
              )}
            >
              <div
                className={cn(
                  "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl",
                  light ? "bg-sapphire/5 text-sapphire/30" : "bg-gold/5 text-gold/30"
                )}
              >
                <MessageSquare size={28} strokeWidth={1.5} />
              </div>
              <p
                className={cn(
                  "text-sm font-medium mb-1",
                  light ? "text-onyx/50" : "text-cream/50"
                )}
              >
                No queries yet
              </p>
              <p
                className={cn(
                  "text-xs mb-6",
                  light ? "text-onyx/30" : "text-cream/25"
                )}
              >
                Your support requests will appear here
              </p>
              <Link
                href="/contact"
                className={cn(
                  "inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] px-7 py-3 rounded-full transition-all",
                  light
                    ? "bg-sapphire text-white hover:shadow-[0_0_30px_rgba(30,58,138,0.3)]"
                    : "bg-gold text-abyss hover:shadow-[0_0_30px_rgba(212,175,55,0.3)]"
                )}
              >
                <Send size={12} />
                Contact Us
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isExpanded = expandedId === msg.id;
                const badge = STATUS_BADGE[msg.status] || STATUS_BADGE.pending;

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "rounded-2xl border overflow-hidden transition-all duration-300",
                      isExpanded
                        ? cn(
                            "shadow-lg",
                            light
                              ? "border-sapphire/15 bg-white"
                              : "border-gold/15 bg-white/[0.03]"
                          )
                        : cn(
                            "hover:shadow-md",
                            light
                              ? "border-onyx/8 bg-white"
                              : "border-white/8 bg-white/[0.02]"
                          )
                    )}
                  >
                    {/* Collapsed header */}
                    <button
                      onClick={() =>
                        setExpandedId(isExpanded ? null : msg.id)
                      }
                      className={cn(
                        "w-full text-left px-5 sm:px-6 py-4 flex items-center gap-4 transition-colors group",
                        light ? "hover:bg-sapphire/[0.02]" : "hover:bg-gold/[0.02]"
                      )}
                    >
                      <div
                        className={cn(
                          "w-2.5 h-2.5 rounded-full flex-shrink-0",
                          badge.dot
                        )}
                      />

                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-sm font-medium truncate",
                            light ? "text-onyx" : "text-white"
                          )}
                        >
                          {msg.subject}
                        </p>
                        <p
                          className={cn(
                            "text-xs mt-0.5",
                            light ? "text-onyx/40" : "text-cream/35"
                          )}
                        >
                          {formatDate(msg.createdAt)}
                        </p>
                      </div>

                      <span
                        className={cn(
                          "hidden sm:flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border font-medium flex-shrink-0",
                          badge.bg,
                          badge.text,
                          badge.border
                        )}
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full", badge.dot)} />
                        {badge.label}
                      </span>

                      {msg.replyMessage && (
                        <span className="hidden sm:flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-medium flex-shrink-0">
                          <ShieldCheck size={10} />
                          Reply received
                        </span>
                      )}

                      <ChevronDown
                        size={16}
                        className={cn(
                          "shrink-0 transition-transform duration-300",
                          isExpanded && "rotate-180",
                          light ? "text-onyx/25" : "text-cream/20"
                        )}
                      />
                    </button>

                    {/* Mobile status badges */}
                    {isExpanded && (
                      <div
                        className={cn(
                          "flex items-center gap-2 px-5 sm:px-6 pb-0 pt-0 sm:hidden"
                        )}
                      >
                        <span
                          className={cn(
                            "flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border font-medium",
                            badge.bg,
                            badge.text,
                            badge.border
                          )}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full", badge.dot)} />
                          {badge.label}
                        </span>
                        {msg.replyMessage && (
                          <span className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-medium">
                            <ShieldCheck size={10} />
                            Reply received
                          </span>
                        )}
                      </div>
                    )}

                    {/* Expanded content */}
                    {isExpanded && (
                      <div
                        className={cn(
                          "px-5 sm:px-6 pb-6 pt-4 border-t",
                          light ? "border-onyx/5" : "border-white/5"
                        )}
                      >
                        {/* Stepper */}
                        <div className="mb-6">
                          <p
                            className={cn(
                              "text-[10px] uppercase tracking-[0.2em] mb-4 font-medium",
                              light ? "text-onyx/35" : "text-cream/25"
                            )}
                          >
                            Order Status
                          </p>
                          <Stepper msg={msg} light={light} />
                        </div>

                        {/* User message */}
                        <div className="mb-5">
                          <p
                            className={cn(
                              "text-[10px] uppercase tracking-[0.2em] mb-2.5 font-medium",
                              light ? "text-onyx/35" : "text-cream/25"
                            )}
                          >
                            Your Message
                          </p>
                          <div
                            className={cn(
                              "rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed border",
                              light
                                ? "bg-onyx/[0.03] border-onyx/5 text-onyx"
                                : "bg-white/[0.02] border-white/5 text-cream"
                            )}
                          >
                            {msg.message}
                          </div>
                        </div>

                        {/* Admin reply */}
                        {msg.replyMessage ? (
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] mb-2.5 font-medium text-emerald-500">
                              Reply from BATRAVERSE
                            </p>
                            <div
                              className={cn(
                                "rounded-xl p-4 border text-sm whitespace-pre-wrap leading-relaxed",
                                "bg-emerald-500/5 border-emerald-500/15",
                                light
                                  ? "text-emerald-800"
                                  : "text-emerald-300"
                              )}
                            >
                              {msg.replyMessage}
                            </div>
                            {msg.repliedAt && (
                              <p
                                className={cn(
                                  "text-[10px] mt-2",
                                  light ? "text-onyx/30" : "text-cream/25"
                                )}
                              >
                                Replied on {formatDateTime(msg.repliedAt)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div
                            className={cn(
                              "rounded-xl border p-4 text-center",
                              light
                                ? "bg-amber-50 border-amber-200/50"
                                : "bg-amber-500/5 border-amber-500/10"
                            )}
                          >
                            <Clock
                              size={20}
                              className={cn(
                                "mx-auto mb-2",
                                light
                                  ? "text-amber-500/60"
                                  : "text-amber-400/50"
                              )}
                            />
                            <p
                              className={cn(
                                "text-xs",
                                light
                                  ? "text-amber-700/70"
                                  : "text-amber-300/60"
                              )}
                            >
                              Awaiting response from our team
                            </p>
                            <p
                              className={cn(
                                "text-[10px] mt-1",
                                light
                                  ? "text-amber-600/40"
                                  : "text-amber-400/30"
                              )}
                            >
                              We typically respond within 24 hours
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* CTA */}
          {messages.length > 0 && (
            <div className="text-center pt-4">
              <Link
                href="/contact"
                className={cn(
                  "inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] px-8 py-3.5 rounded-full transition-all",
                  light
                    ? "border border-onyx/12 bg-white text-sapphire hover:border-sapphire/30 hover:shadow-[0_16px_40px_rgba(30,58,138,0.08)]"
                    : "border border-white/12 bg-white/[0.03] text-gold-light hover:border-gold/30 hover:shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
                )}
              >
                <Send size={12} />
                New Query
                <ChevronRight size={10} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}

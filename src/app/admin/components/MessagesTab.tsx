/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { MessageSquare, Mail, Trash2 } from "lucide-react";
import { msgStatusColors, API, adminHeaders } from "./types";
import ReplyInline from "./ReplyInline";
import { useConfirm } from "@/components/useConfirm";

export default function MessagesTab({
  messages,
  adminKey,
  setMessages,
}: {
  messages: any;
  adminKey: string;
  setMessages: React.Dispatch<React.SetStateAction<any>>;
}) {
  const [msgFilter, setMsgFilter] = useState("all");
  const [replyingMessageId, setReplyingMessageId] = useState<string | null>(null);

  const { confirm, prompt, ConfirmDialog, PromptDialog } = useConfirm();

  const filteredMessages =
    messages?.messages?.filter((m: any) => {
      if (msgFilter === "all") return true;
      if (msgFilter === "unread") return !m.read;
      if (msgFilter === "pending") return m.status === "pending";
      if (msgFilter === "replied") return m.status === "replied";
      if (msgFilter === "resolved") return m.status === "resolved";
      return true;
    }) || [];

  const markAsRead = async (id: string) => {
    try {
      await fetch(`${API}/api/messages/${id}/read`, {
        method: "PUT",
        headers: adminHeaders(adminKey),
      });
      setMessages((prev: any) => ({
        ...prev,
        unread: Math.max(0, (prev.unread || 0) - 1),
        messages: prev.messages.map((m: any) =>
          m.id === id ? { ...m, read: true } : m
        ),
      }));
    } catch {}
  };

  const deleteMessage = async (id: string) => {
    if (!(await confirm("Delete this message?"))) return;
    try {
      await fetch(`${API}/api/messages/${id}`, {
        method: "DELETE",
        headers: adminHeaders(adminKey),
      });
      setMessages((prev: any) => {
        const target = prev.messages.find((m: any) => m.id === id);
        return {
          ...prev,
          total: Math.max(0, (prev.total || 0) - 1),
          unread: target && !target.read
            ? Math.max(0, (prev.unread || 0) - 1)
            : prev.unread,
          messages: prev.messages.filter((m: any) => m.id !== id),
        };
      });
    } catch {}
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`${API}/api/messages/${id}/status`, {
        method: "PUT",
        headers: adminHeaders(adminKey),
        body: JSON.stringify({ status }),
      });
      setMessages((prev: any) => ({
        ...prev,
        messages: prev.messages.map((m: any) =>
          m.id === id ? { ...m, status } : m
        ),
      }));
    } catch {}
  };

  const filterButtons = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread" },
    { key: "pending", label: "Pending" },
    { key: "replied", label: "Replied" },
    { key: "resolved", label: "Resolved" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <MessageSquare size={20} className="text-gold-400" />
          Messages
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filterButtons.map((f) => (
            <button
              key={f.key}
              onClick={() => setMsgFilter(f.key)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap ${
                msgFilter === f.key
                  ? "bg-gold-500/10 border-gold-500/30 text-gold-400"
                  : "bg-dark-900/60 border-dark-800/50 text-dark-400 hover:text-white hover:border-dark-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: messages?.total || 0, color: "text-white" },
          { label: "Unread", value: messages?.unread || 0, color: "text-gold-400" },
          {
            label: "Replied",
            value: messages?.messages?.filter((m: any) => m.status === "replied").length || 0,
            color: "text-emerald-400",
          },
          {
            label: "Resolved",
            value: messages?.messages?.filter((m: any) => m.status === "resolved").length || 0,
            color: "text-sky-400",
          },
        ].map((s) => (
          <div key={s.label} className="bg-dark-900/60 border border-dark-800/50 rounded-xl p-3 text-center">
            <p className="text-xs text-dark-500">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Messages List */}
      {filteredMessages.length === 0 ? (
        <div className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-12 text-center">
          <MessageSquare size={40} className="mx-auto text-dark-600 mb-3" />
          <p className="text-dark-500 text-sm">No messages found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMessages.map((msg: any) => (
            <div
              key={msg.id}
              className={`bg-dark-900/60 border rounded-2xl overflow-hidden ${
                !msg.read ? "border-gold-500/20" : "border-dark-800/50"
              }`}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      !msg.read
                        ? "bg-gold-500/10 border border-gold-500/20 text-gold-400"
                        : "bg-dark-800 border border-dark-700 text-dark-400"
                    }`}
                  >
                    <span className="text-sm font-bold">
                      {msg.name?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">{msg.name}</span>
                      {!msg.read && (
                        <span className="w-2 h-2 rounded-full bg-gold-400 flex-shrink-0" />
                      )}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          msgStatusColors[msg.status] || msgStatusColors.pending
                        }`}
                      >
                        {msg.status}
                      </span>
                      {msg.subject && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-dark-800 border border-dark-700 text-dark-400">
                          {msg.subject}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-dark-500 mt-0.5 flex items-center gap-2">
                      <Mail size={10} />
                      {msg.email}
                      {msg.user && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold-500/10 border border-gold-500/20 text-gold-400">
                          Account user
                        </span>
                      )}
                      <span className="text-dark-600">
                        {new Date(msg.createdAt).toLocaleDateString()}
                      </span>
                    </p>
                    <p className="text-sm text-dark-300 mt-2 whitespace-pre-wrap">{msg.message}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {!msg.read && (
                    <button
                      onClick={() => markAsRead(msg.id)}
                      className="text-xs bg-gold-500/10 border border-gold-500/20 text-gold-400 px-3 py-1.5 rounded-lg hover:bg-gold-500/20 transition-all"
                    >
                      Read
                    </button>
                  )}
                  <button
                    onClick={() => deleteMessage(msg.id)}
                    className="text-xs bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-all flex items-center gap-1"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(["pending", "in-progress", "replied", "resolved"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => updateStatus(msg.id, s)}
                        disabled={msg.status === s}
                        className={`text-[10px] font-medium px-2.5 py-1 rounded-md border transition-all disabled:opacity-50 capitalize ${
                          msg.status === s
                            ? `${msgStatusColors[s] || msgStatusColors.pending} ring-1 ring-gold-500/20`
                            : "bg-dark-800 text-dark-500 border-dark-700 hover:text-white"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() =>
                      setReplyingMessageId(replyingMessageId === msg.id ? null : msg.id)
                    }
                    className="text-xs bg-emerald-600/10 border border-emerald-600/20 text-emerald-400 px-3 py-1.5 rounded-lg hover:bg-emerald-600/20 transition-all"
                  >
                    Reply
                  </button>
                </div>

                {/* Reply Inline */}
                {replyingMessageId === msg.id && (
                  <ReplyInline
                    msgId={msg.id}
                    msgName={msg.name}
                    adminKey={adminKey}
                    onSent={() => {
                      setReplyingMessageId(null);
                      setMessages((prev: any) => ({
                        ...prev,
                        messages: prev.messages.map((m: any) =>
                          m.id === msg.id
                            ? { ...m, status: "replied", read: true }
                            : m
                        ),
                      }));
                    }}
                  />
                )}

                {/* Sent Reply Display */}
                {msg.replyMessage && (
                  <div className="mt-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3">
                    <p className="text-[10px] text-emerald-500/60 mb-1">
                      Reply sent {msg.repliedAt ? new Date(msg.repliedAt).toLocaleDateString() : ""}
                    </p>
                    <p className="text-sm text-emerald-400/80 whitespace-pre-wrap">{msg.replyMessage}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {ConfirmDialog}
      {PromptDialog}
    </div>
  );
}

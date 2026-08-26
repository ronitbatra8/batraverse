/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { API } from "./types";

export default function ReplyInline({ msgId, msgName, adminKey, onSent }: { msgId: string; msgName: string; adminKey: string; onSent: () => void }) {
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    if (reply.trim().length < 3) { setError("Reply must be at least 3 characters"); return; }
    setSending(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/messages/${msgId}/reply`, { method: "POST", headers: { "x-admin-key": adminKey, "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" }, body: JSON.stringify({ replyMessage: reply.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setReply("");
      onSent();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-3 bg-dark-800/50 rounded-xl p-4 border border-dark-700/50">
      <p className="text-xs text-dark-400 mb-2">Reply to <span className="text-gold-400">{msgName}</span></p>
      <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} placeholder="Type your reply..." className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-dark-500 focus:outline-none focus:border-gold-500 transition-colors resize-none" />
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      <div className="flex justify-end mt-2">
        <button onClick={handleSend} disabled={sending} className="text-xs bg-gold-500 hover:bg-gold-400 text-dark-950 px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50">
          <Send size={12} /> {sending ? "Sending..." : "Send Reply"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { Trash2, Plus, X, Pencil, Upload, Loader2, ChevronRight } from "lucide-react";
import { API } from "./types";
import { getAuth } from "@/lib/authStorage";
import { resolveImageUrl } from "@/lib/imageUrl";

export type SectionRow = {
  id: string;
  name: string;
  image: string | null;
  sortOrder: number;
  badge?: string;
};

export type NotAddedItem = {
  key: string;
  label: string;
  badge?: string;
  /** Parent category slug, used by the aggregated "All" sub-category view. */
  parent?: string;
};

type SectionEditorProps = {
  rows: SectionRow[];
  notAdded: NotAddedItem[];
  loading: boolean;
  adminKey: string;
  showSourceBadge?: boolean;
  heading: string;
  notAddedHeading: string;
  addHeading: string;
  addHint: string;
  createLabel: string;
  namePlaceholder: string;
  emptyHint: string;
  onCreate: (name: string, image: string) => Promise<void>;
  onAddExisting: (key: string, label: string, image: string, parent?: string) => Promise<void>;
  onEditImage: (id: string, image: string) => Promise<void>;
  onRemove: (row: SectionRow) => Promise<void>;
  onReorder: (row: SectionRow, dir: -1 | 1) => Promise<void>;
  /** Aggregated views cannot create without a parent — hides the create form. */
  createDisabled?: boolean;
  createDisabledHint?: string;
};

/**
 * Shared editor for a curated section (main categories or subcategories).
 * Only the image is editable per card; name/source/GST stay in the category system.
 */
export default function SectionEditor({
  rows,
  notAdded,
  loading,
  adminKey,
  showSourceBadge = false,
  heading,
  notAddedHeading,
  addHeading,
  addHint,
  createLabel,
  namePlaceholder,
  emptyHint,
  onCreate,
  onAddExisting,
  onEditImage,
  onRemove,
  onReorder,
  createDisabled = false,
  createDisabledHint,
}: SectionEditorProps) {
  const [newName, setNewName] = useState("");
  const [newImage, setNewImage] = useState("");
  const [creating, setCreating] = useState(false);

  const [imageFor, setImageFor] = useState<
    | { mode: "create"; key: string; label: string; parent?: string }
    | { mode: "edit"; id: string; current: string | null; label: string }
    | null
  >(null);
  const [imageDraft, setImageDraft] = useState("");
  const [savingImage, setSavingImage] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const openImageModal = (payload: typeof imageFor) => {
    setImageFor(payload);
    setImageDraft(payload?.mode === "edit" ? payload.current ?? "" : "");
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("images", file);
      // adminHeaders() forces application/json which breaks multipart parsing.
      const headers: Record<string, string> = { "ngrok-skip-browser-warning": "true" };
      if (adminKey) headers["x-admin-key"] = adminKey;
      const token = getAuth("bt-token");
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API}/api/admin/upload`, { method: "POST", headers, body: fd });
      let data: { urls?: string[]; error?: string };
      try {
        data = await res.json();
      } catch {
        throw new Error("Server returned an invalid response");
      }
      if (!res.ok || !data?.urls?.[0]) throw new Error(data?.error || "Upload failed");
      setImageDraft(data.urls[0]);
    } finally {
      setUploading(false);
    }
  };

  const saveImageModal = async () => {
    if (!imageFor) return;
    setSavingImage(true);
    try {
      if (imageFor.mode === "create") {
        await onAddExisting(imageFor.key, imageFor.label, imageDraft.trim(), imageFor.parent);
      } else {
        await onEditImage(imageFor.id, imageDraft.trim());
      }
      setImageFor(null);
    } finally {
      setSavingImage(false);
    }
  };

  const create = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await onCreate(newName.trim(), newImage.trim());
      setNewName("");
      setNewImage("");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      {/* LEFT — cards currently in the section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">{heading}</h3>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/35">
            {rows.length} {rows.length === 1 ? "card" : "cards"}
          </span>
        </div>

        {loading ? (
          <p className="text-sm text-white/40">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-white/40">
            {emptyHint}
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {rows.map((row, i) => (
              <li
                key={row.id}
                className="group relative flex min-h-[11rem] flex-col items-center justify-end overflow-hidden rounded-2xl border border-white/10 p-3 text-center sm:min-h-[13rem] lg:min-h-[16rem]"
              >
                {row.image ? (
                  <img
                    src={resolveImageUrl(row.image)}
                    alt={row.name}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <span className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-black" />
                )}

                <span className="relative w-full rounded-xl bg-gradient-to-t from-black/95 via-black/60 to-black/10 p-3 text-left">
                  <span className="block text-[11px] font-semibold leading-tight text-white">{row.name}</span>
                  <span className="mt-1 flex items-center gap-0.5 text-[8px] font-medium uppercase tracking-[0.22em] text-white/60">
                    Explore
                    <ChevronRight size={10} />
                  </span>
                </span>

                <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    title="Change image"
                    onClick={() => openImageModal({ mode: "edit", id: row.id, current: row.image, label: row.name })}
                    className="grid h-7 w-7 place-items-center rounded-md border border-white/25 bg-black/70 text-white/80 hover:border-gold hover:text-gold"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    title="Remove from section"
                    onClick={() => onRemove(row)}
                    className="grid h-7 w-7 place-items-center rounded-md border border-white/25 bg-black/70 text-white/80 hover:border-red-400 hover:text-red-400"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                <div className="absolute left-2 top-2 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    title="Move up"
                    onClick={() => onReorder(row, -1)}
                    className="grid h-6 w-6 place-items-center rounded-md border border-white/25 bg-black/70 text-[10px] text-white/80 hover:border-gold hover:text-gold disabled:opacity-30"
                    disabled={i === 0}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    title="Move down"
                    onClick={() => onReorder(row, 1)}
                    className="grid h-6 w-6 place-items-center rounded-md border border-white/25 bg-black/70 text-[10px] text-white/80 hover:border-gold hover:text-gold disabled:opacity-30"
                    disabled={i === rows.length - 1}
                  >
                    ↓
                  </button>
                </div>

                {showSourceBadge && row.badge ? (
                  <span className="absolute left-2 bottom-2 rounded bg-black/70 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.2em] text-white/60">
                    {row.badge}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* RIGHT — add custom + existing entries not in the section */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">{addHeading}</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-white/40">{addHint}</p>

          <div className="mt-3 space-y-2.5">
            {createDisabled ? (
              <p className="rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-[11px] leading-relaxed text-white/45">
                {createDisabledHint}
              </p>
            ) : (
              <>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={namePlaceholder}
                  className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-gold focus:outline-none"
                />
                <input
                  value={newImage}
                  onChange={(e) => setNewImage(e.target.value)}
                  placeholder="Image URL (optional)"
                  className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-gold focus:outline-none"
                />
                <button
                  type="button"
                  onClick={create}
                  disabled={creating || !newName.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-gold bg-gold/10 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold transition-colors hover:bg-gold hover:text-black disabled:opacity-40"
                >
                  {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {createLabel}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">{notAddedHeading}</h3>
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/35">{notAdded.length}</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-white/40">
            Live from the category system. Add one to pull it into the section.
          </p>

          <ul className="mt-3 max-h-[24rem] space-y-1.5 overflow-y-auto pr-1">
            {loading ? (
              <li className="text-sm text-white/40">Loading…</li>
            ) : notAdded.length === 0 ? (
              <li className="text-sm text-white/40">Nothing left to add.</li>
            ) : (
              notAdded.map((item) => (
                <li
                  key={item.key}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-white">{item.label}</span>
                    {item.badge ? (
                      <span className="block text-[9px] uppercase tracking-[0.2em] text-white/30">{item.badge}</span>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    onClick={() => openImageModal({ mode: "create", key: item.key, label: item.label, parent: item.parent })}
                    className="flex shrink-0 items-center gap-1.5 rounded-md border border-white/20 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70 transition-colors hover:border-gold hover:bg-gold hover:text-black"
                  >
                    <Plus size={12} /> Add
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {/* Image modal */}
      {imageFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0d0d0d] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">
                  {imageFor.mode === "create" ? "Add to section" : "Change image"}
                </h4>
                <p className="mt-1 text-xs text-white/45">{imageFor.label}</p>
              </div>
              <button
                type="button"
                onClick={() => setImageFor(null)}
                className="grid h-7 w-7 place-items-center rounded-md border border-white/15 text-white/60 hover:border-white/40 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>

            {imageDraft && (
              <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveImageUrl(imageDraft)} alt="" className="h-40 w-full object-cover" />
              </div>
            )}

            <input
              value={imageDraft}
              onChange={(e) => setImageDraft(e.target.value)}
              placeholder="Paste image URL"
              className="mt-4 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-gold focus:outline-none"
            />

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadFile(f);
                e.target.value = "";
              }}
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white/70 hover:border-gold hover:text-gold disabled:opacity-40"
              >
                {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                Upload
              </button>
              <button
                type="button"
                onClick={saveImageModal}
                disabled={savingImage}
                className="rounded-lg border border-gold bg-gold px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-black hover:opacity-90 disabled:opacity-40"
              >
                {savingImage ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
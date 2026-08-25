"use client";

import { useState, useCallback, useRef } from "react";
import ConfirmModal from "@/components/ConfirmModal";

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  variant: "danger" | "default";
  confirmLabel: string;
}

interface PromptState {
  open: boolean;
  title: string;
  message: string;
  inputLabel: string;
  inputPlaceholder: string;
  inputValue: string;
  variant: "danger" | "default";
  confirmLabel: string;
}

export function useConfirm() {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false, title: "", message: "", variant: "default", confirmLabel: "Confirm",
  });
  const [promptState, setPromptState] = useState<PromptState>({
    open: false, title: "", message: "", inputLabel: "", inputPlaceholder: "", inputValue: "", variant: "default", confirmLabel: "Confirm",
  });

  const resolveRef = useRef<(value: boolean) => void>(() => {});
  const resolvePromptRef = useRef<(value: string | null) => void>(() => {});

  const confirm = useCallback((message: string, opts?: { title?: string; variant?: "danger" | "default"; confirmLabel?: string }) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setConfirmState({
        open: true,
        title: opts?.title || "Are you sure?",
        message,
        variant: opts?.variant || "default",
        confirmLabel: opts?.confirmLabel || "Confirm",
      });
    });
  }, []);

  const prompt = useCallback((message: string, opts?: { title?: string; inputLabel?: string; inputPlaceholder?: string; defaultValue?: string; variant?: "danger" | "default"; confirmLabel?: string }) => {
    return new Promise<string | null>((resolve) => {
      resolvePromptRef.current = resolve;
      setPromptState({
        open: true,
        title: opts?.title || "Input Required",
        message,
        inputLabel: opts?.inputLabel || "",
        inputPlaceholder: opts?.inputPlaceholder || "",
        inputValue: opts?.defaultValue || "",
        variant: opts?.variant || "default",
        confirmLabel: opts?.confirmLabel || "Submit",
      });
    });
  }, []);

  const ConfirmDialog = (
    <ConfirmModal
      open={confirmState.open}
      title={confirmState.title}
      message={confirmState.message}
      variant={confirmState.variant}
      confirmLabel={confirmState.confirmLabel}
      onConfirm={() => { setConfirmState((s) => ({ ...s, open: false })); resolveRef.current(true); }}
      onCancel={() => { setConfirmState((s) => ({ ...s, open: false })); resolveRef.current(false); }}
    />
  );

  const PromptDialog = (
    <ConfirmModal
      open={promptState.open}
      title={promptState.title}
      message={promptState.message}
      variant={promptState.variant}
      confirmLabel={promptState.confirmLabel}
      requireInput
      inputLabel={promptState.inputLabel}
      inputPlaceholder={promptState.inputPlaceholder}
      inputValue={promptState.inputValue}
      onInputChange={(val) => setPromptState((s) => ({ ...s, inputValue: val }))}
      onConfirm={() => {
        const value = promptState.inputValue;
        setPromptState((s) => ({ ...s, open: false, inputValue: "" }));
        resolvePromptRef.current(value || null);
      }}
      onCancel={() => {
        setPromptState((s) => ({ ...s, open: false, inputValue: "" }));
        resolvePromptRef.current(null);
      }}
    />
  );

  return { confirm, prompt, ConfirmDialog, PromptDialog };
}

"use client";

import * as React from "react";
import { toast } from "sonner";
import { saveAnswerAction } from "@/server/actions/onboarding";
import { computeOnboarding, type AnswerState, type OnboardingContext } from "@/lib/onboarding";

export type SaveState = "idle" | "saving" | "saved" | "error";
export interface OnbFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
}

/**
 * Local onboarding state with per-field debounced autosave.
 * The latest value always wins; failures keep the typed value and show an error.
 */
export function useOnboarding(opts: {
  projectId: string;
  ctx: OnboardingContext;
  initialAnswers: Record<string, AnswerState>;
  initialFiles: Record<string, OnbFile[]>;
}) {
  const [answers, setAnswers] = React.useState(opts.initialAnswers);
  const [files, setFiles] = React.useState(opts.initialFiles);
  const [fieldState, setFieldState] = React.useState<Record<string, { state: SaveState; error?: string }>>({});
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null);
  const timers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const seq = React.useRef<Record<string, number>>({});
  const inflight = React.useRef(0);
  const [saving, setSaving] = React.useState(false);

  const persist = React.useCallback(
    async (key: string, value: unknown, status: AnswerState["status"]) => {
      const my = (seq.current[key] = (seq.current[key] ?? 0) + 1);
      inflight.current++;
      setSaving(true);
      setFieldState((s) => ({ ...s, [key]: { state: "saving" } }));
      try {
        const res = await saveAnswerAction(opts.projectId, key, value, status);
        if (seq.current[key] !== my) return; // a newer save superseded this one
        if (res.ok) {
          setFieldState((s) => ({ ...s, [key]: { state: "saved" } }));
          setLastSavedAt(new Date());
          // Server may normalise values (e.g. add https:// to links).
          if (status === "answered" && res.data.value !== undefined && typeof value === "string" && res.data.value !== value && res.data.value !== null) {
            setAnswers((a) => ({ ...a, [key]: { value: res.data.value, status } }));
          }
        } else {
          setFieldState((s) => ({ ...s, [key]: { state: "error", error: res.error } }));
        }
      } catch {
        if (seq.current[key] === my) {
          setFieldState((s) => ({ ...s, [key]: { state: "error", error: "Couldn't save — check your connection. Your answer is kept." } }));
          toast.error("Couldn't save your last answer. We'll keep it on screen — try again.");
        }
      } finally {
        inflight.current--;
        if (inflight.current === 0) setSaving(false);
      }
    },
    [opts.projectId],
  );

  const setValue = React.useCallback(
    (key: string, value: unknown, { debounce = 0 }: { debounce?: number } = {}) => {
      setAnswers((a) => ({ ...a, [key]: { value, status: "answered" } }));
      clearTimeout(timers.current[key]);
      if (debounce) {
        setFieldState((s) => ({ ...s, [key]: { state: "idle" } }));
        timers.current[key] = setTimeout(() => persist(key, value, "answered"), debounce);
      } else {
        persist(key, value, "answered");
      }
    },
    [persist],
  );

  /** Flush a pending debounced save immediately (on blur / navigation). */
  const flush = React.useCallback(
    (key: string) => {
      if (timers.current[key]) {
        clearTimeout(timers.current[key]);
        delete timers.current[key];
        const a = answers[key];
        if (a) persist(key, a.value, a.status);
      }
    },
    [answers, persist],
  );

  const flushAll = React.useCallback(() => {
    Object.keys(timers.current).forEach((k) => flush(k));
  }, [flush]);

  const setStatus = React.useCallback(
    (key: string, status: AnswerState["status"]) => {
      clearTimeout(timers.current[key]);
      const prev = answers[key];
      const value = status === "answered" ? (prev?.value ?? null) : null;
      setAnswers((a) => ({ ...a, [key]: { value: status === "answered" ? value : prev?.value ?? null, status } }));
      persist(key, value, status);
    },
    [answers, persist],
  );

  const addFiles = React.useCallback((key: string, added: OnbFile[]) => {
    setFiles((f) => ({ ...f, [key]: [...(f[key] ?? []), ...added] }));
    setLastSavedAt(new Date());
  }, []);

  const removeFile = React.useCallback((key: string, id: string) => {
    setFiles((f) => ({ ...f, [key]: (f[key] ?? []).filter((x) => x.id !== id) }));
  }, []);

  // Warn before leaving with unsaved edits.
  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (Object.keys(timers.current).length || inflight.current > 0) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const fileCounts = React.useMemo(() => Object.fromEntries(Object.entries(files).map(([k, v]) => [k, v.length])), [files]);
  const computed = React.useMemo(() => computeOnboarding(opts.ctx, answers, fileCounts), [opts.ctx, answers, fileCounts]);
  const hasErrors = Object.values(fieldState).some((f) => f.state === "error");

  return { answers, files, fieldState, setValue, setStatus, flush, flushAll, addFiles, removeFile, computed, saving, lastSavedAt, hasErrors };
}

export type OnboardingState = ReturnType<typeof useOnboarding>;

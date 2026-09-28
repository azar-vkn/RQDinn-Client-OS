"use client";

import * as React from "react";
import { AlertCircle, Check, Clock, FileText, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { OnboardingField } from "@/lib/onboarding";
import { isEmail, isHexColor, isPhone, normalizeUrl } from "@/lib/validators";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Dropzone } from "@/components/files/uploader";
import { deleteFileAction } from "@/server/actions/files";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OnboardingState } from "./use-onboarding";

function clientCheck(field: OnboardingField, v: string): string | null {
  if (!v.trim()) return null;
  if (field.type === "url" && normalizeUrl(v) === null) return "That doesn't look like a valid link.";
  if (field.type === "email" && !isEmail(v)) return "That doesn't look like a valid email.";
  if (field.type === "phone" && !isPhone(v)) return "That doesn't look like a valid phone number.";
  if (field.type === "color" && !isHexColor(v)) return "Use a hex colour like #D97757.";
  return null;
}

export function SaveIndicator({ state }: { state?: { state: string; error?: string } }) {
  if (!state || state.state === "idle") return null;
  if (state.state === "saving")
    return (
      <span className="flex items-center gap-1 text-[11px] text-muted">
        <Loader2 className="size-3 animate-spin" /> Saving…
      </span>
    );
  if (state.state === "saved")
    return (
      <span className="flex items-center gap-1 text-[11px] text-green-dark animate-fade-in">
        <Check className="size-3" /> Saved
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-[11px] text-danger">
      <AlertCircle className="size-3" /> Not saved
    </span>
  );
}

export function FieldInput({
  field,
  ob,
  projectId,
  large,
  readOnly,
  autoFocus,
  onEnter,
}: {
  field: OnboardingField;
  ob: OnboardingState;
  projectId: string;
  large?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  onEnter?: () => void;
}) {
  const answer = ob.answers[field.key];
  const later = answer?.status === "client_later";
  const na = answer?.status === "not_applicable";
  const value = answer?.value;
  const [localError, setLocalError] = React.useState<string | null>(null);
  const serverError = ob.fieldState[field.key]?.state === "error" ? ob.fieldState[field.key]?.error : null;
  const error = localError ?? serverError;
  const size = large ? "h-13 text-lg px-4 rounded-xl" : "";
  const [custom, setCustom] = React.useState("");

  const textProps = {
    id: field.key,
    disabled: readOnly,
    autoFocus,
    "aria-invalid": !!error || undefined,
    placeholder: field.placeholder,
  };

  let control: React.ReactNode;
  switch (field.type) {
    case "textarea":
      control = (
        <Textarea
          {...textProps}
          value={typeof value === "string" ? value : ""}
          rows={large ? 5 : 3}
          className={cn(large && "rounded-xl px-4 py-3 text-lg")}
          onChange={(e) => ob.setValue(field.key, e.target.value, { debounce: 800 })}
          onBlur={() => ob.flush(field.key)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              ob.flush(field.key);
              onEnter?.();
            }
          }}
        />
      );
      break;
    case "select":
      control = (
        <Select {...textProps} value={typeof value === "string" ? value : ""} className={cn(size)} onChange={(e) => ob.setValue(field.key, e.target.value)}>
          <option value="">Choose…</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      );
      break;
    case "multiselect":
    case "checklist": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      const options = Array.from(new Set([...(field.options ?? []), ...selected]));
      const toggle = (o: string) => ob.setValue(field.key, selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o]);
      control = (
        <div className="space-y-3">
          <div className={cn("grid gap-2", field.type === "checklist" ? "grid-cols-1 sm:grid-cols-2" : "flex flex-wrap")}>
            {options.map((o) => {
              const on = selected.includes(o);
              return field.type === "checklist" ? (
                <label
                  key={o}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 transition",
                    large ? "py-3.5 text-base" : "py-2.5 text-sm",
                    on ? "border-orange/40 bg-orange-soft/60 text-ink" : "border-line bg-white text-ink-soft hover:border-[#d9d1c4]",
                    readOnly && "pointer-events-none",
                  )}
                >
                  <input type="checkbox" checked={on} onChange={() => toggle(o)} className="size-[18px]" disabled={readOnly} />
                  <span className="flex-1">{o}</span>
                  {!field.options?.includes(o) && <span className="text-[10px] uppercase tracking-wider text-subtle">Custom</span>}
                </label>
              ) : (
                <button
                  key={o}
                  type="button"
                  disabled={readOnly}
                  onClick={() => toggle(o)}
                  className={cn(
                    "rounded-full border px-3.5 transition",
                    large ? "py-2 text-base" : "py-1.5 text-sm",
                    on ? "border-orange bg-orange text-white" : "border-line bg-white text-ink-soft hover:border-orange-light",
                  )}
                >
                  {o}
                </button>
              );
            })}
          </div>
          {field.allowCustom && !readOnly && (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const c = custom.trim();
                if (c && !selected.includes(c)) ob.setValue(field.key, [...selected, c]);
                setCustom("");
              }}
            >
              <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Add a custom requirement…" className={cn(large && "h-11")} />
              <button type="submit" className="flex shrink-0 items-center gap-1 rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink-soft hover:border-orange-light">
                <Plus className="size-4" /> Add
              </button>
            </form>
          )}
        </div>
      );
      break;
    }
    case "color": {
      const v = typeof value === "string" ? value : "";
      control = (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={isHexColor(v) ? (v.length === 4 ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}` : v) : "#d97757"}
            onChange={(e) => ob.setValue(field.key, e.target.value, { debounce: 400 })}
            disabled={readOnly}
            className={cn("cursor-pointer rounded-lg border border-line bg-white p-1", large ? "size-13" : "size-9.5")}
            aria-label={`${field.label} picker`}
          />
          <Input
            {...textProps}
            value={v}
            placeholder="#D97757"
            className={cn("max-w-40 font-mono", size)}
            onChange={(e) => {
              setLocalError(null);
              ob.setValue(field.key, e.target.value, { debounce: 800 });
            }}
            onBlur={(e) => {
              setLocalError(clientCheck(field, e.target.value));
              ob.flush(field.key);
            }}
          />
        </div>
      );
      break;
    }
    case "file": {
      const list = ob.files[field.key] ?? [];
      control = (
        <div className="space-y-2.5">
          {list.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {list.map((f) => (
                <li key={f.id} className="flex items-center gap-2.5 rounded-lg border border-line bg-white px-3 py-2">
                  {f.mimeType.startsWith("image/") && !f.mimeType.includes("svg") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/files/${f.id}?inline=1`} alt="" className="size-9 rounded object-cover" />
                  ) : (
                    <span className="flex size-9 items-center justify-center rounded bg-cream text-muted">
                      <FileText className="size-4" />
                    </span>
                  )}
                  <a href={`/api/files/${f.id}?inline=1`} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">{f.name}</span>
                    <span className="block text-[11px] text-muted">{formatBytes(f.size)}</span>
                  </a>
                  {!readOnly && (
                    <button
                      type="button"
                      className="rounded p-1 text-subtle hover:bg-danger-soft hover:text-danger"
                      aria-label={`Remove ${f.name}`}
                      onClick={async () => {
                        if (!confirm(`Remove ${f.name}?`)) return;
                        const res = await deleteFileAction(f.id);
                        if (res.ok) ob.removeFile(field.key, f.id);
                        else toast.error(res.error);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {!readOnly && (
            <Dropzone
              compact={!large}
              accept={field.accept}
              target={{ projectId, folder: field.folder ?? "Other", onboardingFieldKey: field.key }}
              label={list.length ? "Add more files" : "Upload now — drop files or click"}
              hint="Images, PDFs and documents up to 25 MB"
              onUploaded={(files) => {
                ob.addFiles(field.key, files);
                if (later) ob.setStatus(field.key, "answered");
              }}
            />
          )}
        </div>
      );
      break;
    }
    default:
      control = (
        <Input
          {...textProps}
          type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : field.type === "number" ? "number" : field.type === "url" ? "url" : "text"}
          inputMode={field.type === "phone" ? "tel" : field.type === "number" ? "numeric" : field.type === "url" ? "url" : undefined}
          value={value === null || value === undefined ? "" : String(value)}
          className={cn(size)}
          onChange={(e) => {
            setLocalError(null);
            ob.setValue(field.key, field.type === "number" && e.target.value !== "" ? Number(e.target.value) : e.target.value, { debounce: 700 });
          }}
          onBlur={(e) => {
            setLocalError(clientCheck(field, e.target.value));
            ob.flush(field.key);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              ob.flush(field.key);
              onEnter?.();
            }
          }}
        />
      );
  }

  return (
    <div className={cn(later && "opacity-80")}>
      {later || na ? (
        <div className={cn("flex items-center justify-between gap-3 rounded-xl border border-dashed px-4", large ? "py-4" : "py-3", later ? "border-amber/40 bg-amber-soft/40" : "border-line bg-cream/50")}>
          <span className="flex items-center gap-2 text-sm text-ink-soft">
            {later ? <Clock className="size-4 text-amber" /> : <X className="size-4 text-muted" />}
            {later ? "Client will send later" : "Not applicable"}
          </span>
          {!readOnly && (
            <button type="button" className="text-xs font-medium text-orange-dark hover:underline" onClick={() => ob.setStatus(field.key, "answered")}>
              Answer now
            </button>
          )}
        </div>
      ) : (
        control
      )}
      {later && field.type === "file" && !readOnly && (
        <div className="mt-2">
          <Dropzone compact target={{ projectId, folder: field.folder ?? "Other", onboardingFieldKey: field.key }} label="Received it? Upload now" onUploaded={(files) => { ob.addFiles(field.key, files); ob.setStatus(field.key, "answered"); }} />
        </div>
      )}
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function LaterToggle({ field, ob, readOnly }: { field: OnboardingField; ob: OnboardingState; readOnly?: boolean }) {
  const status = ob.answers[field.key]?.status;
  if (readOnly || status === "client_later" || status === "not_applicable") return null;
  if ((ob.files[field.key]?.length ?? 0) > 0) return null;
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => ob.setStatus(field.key, "client_later")} className="flex items-center gap-1 text-[11px] font-medium text-muted hover:text-amber">
        <Clock className="size-3" /> Client will send later
      </button>
      {!field.required && (
        <button type="button" onClick={() => ob.setStatus(field.key, "not_applicable")} className="text-[11px] font-medium text-subtle hover:text-ink">
          N/A
        </button>
      )}
    </div>
  );
}

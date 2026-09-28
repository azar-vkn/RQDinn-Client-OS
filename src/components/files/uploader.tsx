"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CloudUpload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface UploadTarget {
  projectId?: string | null;
  clientId?: string | null;
  folder?: string | null;
  onboardingFieldKey?: string | null;
  revisionId?: string | null;
  maintenanceRequestId?: string | null;
}

export interface UploadedFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  folder: string;
}

/** Upload with real progress via XHR. */
export function uploadFiles(files: File[], target: UploadTarget, onProgress?: (pct: number) => void): Promise<UploadedFile[]> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    Object.entries(target).forEach(([k, v]) => v && fd.append(k, v));
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/uploads");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let body: { files?: UploadedFile[]; error?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && body.files) resolve(body.files);
      else reject(new Error(body.error || "Unable to upload file. Please try again."));
    };
    xhr.onerror = () => reject(new Error("Unable to upload file. Please check your connection and try again."));
    xhr.send(fd);
  });
}

export function Dropzone({
  target,
  accept,
  multiple = true,
  onUploaded,
  label = "Drop files here or click to upload",
  hint,
  compact,
  className,
  disabled,
}: {
  target: UploadTarget;
  accept?: string;
  multiple?: boolean;
  onUploaded?: (files: UploadedFile[]) => void;
  label?: string;
  hint?: string;
  compact?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [drag, setDrag] = React.useState(false);
  const [progress, setProgress] = React.useState<number | null>(null);

  const handle = async (list: FileList | null) => {
    if (!list?.length) return;
    const files = Array.from(list);
    setProgress(0);
    try {
      const uploaded = await uploadFiles(files, target, setProgress);
      toast.success(uploaded.length === 1 ? `${uploaded[0].name} uploaded` : `${uploaded.length} files uploaded`);
      onUploaded?.(uploaded);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const busy = progress !== null;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={disabled || busy}
      onClick={() => !busy && !disabled && inputRef.current?.click()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (!busy && !disabled) handle(e.dataTransfer.files);
      }}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-[1.5px] border-dashed border-line bg-cream/40 text-center transition",
        compact ? "gap-1 px-4 py-4" : "gap-2 px-6 py-8",
        drag && "border-orange bg-orange-soft/50",
        !busy && !disabled && "hover:border-orange-light hover:bg-orange-soft/30",
        (disabled || busy) && "cursor-default",
        className,
      )}
    >
      <input ref={inputRef} type="file" className="hidden" accept={accept} multiple={multiple} onChange={(e) => handle(e.target.files)} disabled={disabled || busy} />
      {busy ? (
        <>
          <Loader2 className="size-5 animate-spin text-orange" />
          <p className="text-sm font-medium text-ink">Uploading… {progress}%</p>
          <div className="h-1 w-40 overflow-hidden rounded-full bg-cream-dark">
            <div className="h-full bg-orange transition-all" style={{ width: `${progress}%` }} />
          </div>
        </>
      ) : (
        <>
          <CloudUpload className={cn("text-muted transition group-hover:text-orange", compact ? "size-4.5" : "size-6")} />
          <p className={cn("font-medium text-ink-soft", compact ? "text-[13px]" : "text-sm")}>{label}</p>
          {hint && <p className="text-xs text-subtle">{hint}</p>}
        </>
      )}
    </div>
  );
}

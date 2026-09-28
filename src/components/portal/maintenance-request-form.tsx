"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Paperclip, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/input";
import { useAction } from "@/hooks/use-action";
import { createMaintenanceAction } from "@/server/actions/maintenance";
import { uploadFiles } from "@/components/files/uploader";
import { MAINTENANCE_TYPES } from "@/lib/constants";

export function MaintenanceRequestForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [type, setType] = React.useState("text");
  const [description, setDescription] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const { execute, pending } = useAction(createMaintenanceAction, {
    success: false,
    onSuccess: async (d) => {
      if (files.length) {
        setUploading(true);
        try {
          await uploadFiles(files, { maintenanceRequestId: d.id, folder: "Other" });
        } catch (e) {
          toast.error(`Request submitted, but attachments failed: ${(e as Error).message}`);
        } finally {
          setUploading(false);
        }
      }
      toast.success("Request submitted. We'll get back to you soon.");
      setDescription("");
      setFiles([]);
      router.refresh();
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData();
        fd.set("projectId", projectId);
        fd.set("type", type);
        fd.set("description", description);
        execute(fd);
      }}
    >
      <Field label="Update type">
        <Select value={type} onChange={(e) => setType(e.target.value)} className="h-11">
          {MAINTENANCE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Description" required>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Tell us what you'd like changed — the page, the old text and the new text…" />
      </Field>
      <div>
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          accept="image/*,application/pdf,.doc,.docx,video/*"
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []);
            setFiles((f) => [...f, ...picked].slice(0, 10));
            e.target.value = "";
          }}
        />
        <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
          <Paperclip /> Attach files
        </Button>
        {files.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {files.map((f, i) => (
              <li key={i} className="flex items-center gap-1.5 rounded-full bg-cream px-3 py-1 text-xs">
                {f.name}
                <button type="button" onClick={() => setFiles((x) => x.filter((_, idx) => idx !== i))} aria-label={`Remove ${f.name}`}>
                  <X className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Button type="submit" size="lg" className="w-full sm:w-auto" loading={pending || uploading} loadingText={uploading ? "Uploading…" : "Submitting…"} disabled={!description.trim()}>
        <Send /> Submit Request
      </Button>
    </form>
  );
}

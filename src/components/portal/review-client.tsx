"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, MessageSquareWarning, Paperclip, ThumbsUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { useAction } from "@/hooks/use-action";
import { approveProjectAction, requestChangesAction } from "@/server/actions/delivery";
import { uploadFiles } from "@/components/files/uploader";
import { APPROVAL_CONFIRMATION } from "@/lib/constants";

export function ReviewActions({ projectId, version, url, blocked }: { projectId: string; version: string; url: string; blocked: boolean }) {
  const router = useRouter();
  const [mode, setMode] = React.useState<"approve" | "changes" | null>(null);
  const [confirmed, setConfirmed] = React.useState(false);
  const [feedback, setFeedback] = React.useState("");
  const [attachments, setAttachments] = React.useState<File[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const approve = useAction(approveProjectAction, { onSuccess: () => setMode(null) });
  const changes = useAction(requestChangesAction, {
    success: false,
    onSuccess: async (d) => {
      if (attachments.length) {
        setUploading(true);
        try {
          await uploadFiles(attachments, { revisionId: d.revisionId, folder: "Documents" });
        } catch (e) {
          toast.error(`Your feedback was sent, but attachments failed: ${(e as Error).message}`);
        } finally {
          setUploading(false);
        }
      }
      toast.success("Thanks — your changes were sent to the RQdinn team.");
      setFeedback("");
      setAttachments([]);
      setMode(null);
      router.refresh();
    },
  });

  return (
    <>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Button size="xl" variant="success" className="flex-1" onClick={() => setMode("approve")} disabled={blocked}>
          <ThumbsUp /> Approve
        </Button>
        <Button size="xl" variant="secondary" className="flex-1" onClick={() => setMode("changes")}>
          <MessageSquareWarning /> Request Changes
        </Button>
      </div>
      {blocked && <p className="mt-2 text-center text-xs text-muted">We&apos;re working on your last round of changes. You can approve once they&apos;re done.</p>}

      <Dialog open={mode === "approve"} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent title="Approve project" description={`Version ${version}`}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData();
              if (confirmed) fd.set("confirm", "on");
              approve.execute(projectId, fd);
            }}
            className="space-y-4"
          >
            <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-orange-dark hover:underline">
              Open website preview <ExternalLink className="size-3.5" />
            </a>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-cream/60 p-4 text-[15px] leading-relaxed">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1 size-5" />
              <span>{APPROVAL_CONFIRMATION}</span>
            </label>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" variant="success" disabled={!confirmed} loading={approve.pending} loadingText="Approving…">
                APPROVE PROJECT
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === "changes"} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent title="Request changes" description="Please list your changes. Numbered points help us get everything right.">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData();
              fd.set("feedback", feedback);
              changes.execute(projectId, fd);
            }}
            className="space-y-4"
          >
            <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={7} placeholder={"1. Change the homepage headline to…\n2. Replace the second photo in the gallery\n3. …"} autoFocus />
            <div>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/*,application/pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? []);
                  setAttachments((a) => [...a, ...picked].slice(0, 10));
                  e.target.value = "";
                }}
              />
              <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                <Paperclip /> Attach screenshots or files
              </Button>
              {attachments.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {attachments.map((f, i) => (
                    <li key={i} className="flex items-center gap-1.5 rounded-full bg-cream px-3 py-1 text-xs">
                      {f.name}
                      <button type="button" onClick={() => setAttachments((a) => a.filter((_, idx) => idx !== i))} aria-label={`Remove ${f.name}`}>
                        <X className="size-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" loading={changes.pending || uploading} loadingText={uploading ? "Uploading…" : "Sending…"} disabled={!feedback.trim()}>
                Send changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ApprovedCard({ version, name, at }: { version: string; name: string; at: string }) {
  return (
    <Card className="flex gap-3 border-green/30 bg-green-soft p-5">
      <CheckCircle2 className="size-6 shrink-0 text-green" />
      <div>
        <p className="font-medium">
          You approved {version} for launch
        </p>
        <p className="text-sm text-muted">
          {name} · {at}
        </p>
      </div>
    </Card>
  );
}

"use client";

import * as React from "react";
import { CheckCircle2, ExternalLink, Globe, MessageSquareWarning, Plus, Send, ThumbsUp } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { ActionForm } from "@/components/shared/action-form";
import { SelectField, SubmitButton, TextAreaField, TextField } from "@/components/shared/form-fields";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/layout";
import { FileTile, type FileItem } from "@/components/files/file-manager";
import { useAction } from "@/hooks/use-action";
import { addPreviewAction, approveProjectAction, sendPreviewAction, updateRevisionAction } from "@/server/actions/delivery";
import { APPROVAL_CONFIRMATION } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/format";

export interface PreviewView {
  id: string;
  version: string;
  url: string;
  notes: string | null;
  status: string;
  sentAt: Date | string | null;
  createdAt: Date | string;
}
export interface RevisionView {
  id: string;
  round: number;
  status: string;
  clientFeedback: string;
  response: string | null;
  createdAt: Date | string;
  closedAt: Date | string | null;
  previewVersion: string | null;
  requestedBy: string | null;
  files: FileItem[];
}
export interface ApprovalView {
  id: string;
  version: string;
  approvedName: string;
  approvedAt: Date | string;
  confirmation: string;
}

function AddPreviewDialog({ projectId, nextVersion }: { projectId: string; nextVersion: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> Upload preview
        </Button>
      </DialogTrigger>
      <DialogContent title="Website preview" description="Share a staging link with the client for review.">
        <ActionForm action={addPreviewAction.bind(null, projectId)} onSuccess={() => setOpen(false)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_110px]">
            <TextField name="url" label="Preview URL" required placeholder="https://dparkz-v1.vercel.app" />
            <TextField name="version" label="Version" defaultValue={nextVersion} />
          </div>
          <TextAreaField name="notes" label="What's in this version?" rows={3} placeholder="Homepage, menu and contact sections…" />
          <label className="flex items-center gap-2.5 text-sm text-ink-soft">
            <input type="checkbox" name="send" defaultChecked className="size-4" /> Send to client for review now
          </label>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <SubmitButton>Save preview</SubmitButton>
          </DialogFooter>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

function RevisionCard({ r }: { r: RevisionView }) {
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">Revision Round {r.round}</p>
          {r.previewVersion && <Badge tone="outline">{r.previewVersion}</Badge>}
        </div>
        <StatusBadge kind="revision" value={r.status} />
      </div>
      <p className="mt-1 text-xs text-muted">
        Requested {formatDateTime(r.createdAt)}
        {r.requestedBy ? ` by ${r.requestedBy}` : ""}
        {r.closedAt ? ` · Closed ${formatDate(r.closedAt)}` : ""}
      </p>
      <div className="mt-3 rounded-lg bg-amber-soft/50 p-3">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-amber">Client feedback</p>
        <p className="whitespace-pre-line text-sm text-ink">{r.clientFeedback}</p>
      </div>
      {r.files.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {r.files.map((f) => (
            <FileTile key={f.id} f={f} />
          ))}
        </div>
      )}
      <ActionForm action={updateRevisionAction.bind(null, r.id)} className="mt-3 space-y-3">
        <TextAreaField name="response" label="RQdinn response" rows={2} defaultValue={r.response ?? ""} placeholder="What was changed…" />
        <div className="flex flex-wrap items-end gap-2">
          <SelectField
            name="status"
            label="Status"
            className="w-44"
            defaultValue={r.status}
            options={[
              { value: "pending", label: "Pending" },
              { value: "in_progress", label: "In Progress" },
              { value: "completed", label: "Completed" },
            ]}
          />
          <SubmitButton size="md" variant="secondary">
            Update
          </SubmitButton>
        </div>
      </ActionForm>
    </div>
  );
}

export function ReviewPanel({
  projectId,
  previews,
  revisions,
  approvals,
}: {
  projectId: string;
  previews: PreviewView[];
  revisions: RevisionView[];
  approvals: ApprovalView[];
}) {
  const send = useAction(sendPreviewAction);
  const [approveOpen, setApproveOpen] = React.useState(false);
  const inReview = previews.find((p) => p.status === "in_review" || p.status === "changes_requested");
  const openRevisions = revisions.filter((r) => r.status !== "completed");

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-5">
        <Card>
          <CardHeader title="Previews" description="Versions shared with the client." action={<AddPreviewDialog projectId={projectId} nextVersion={`V${previews.length + 1}`} />} />
          {previews.length ? (
            <ul className="divide-y divide-line-soft">
              {previews.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-cream font-semibold text-ink-soft">{p.version}</span>
                  <div className="min-w-0 flex-1">
                    <a href={p.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 truncate text-sm font-medium text-ink hover:text-orange-dark">
                      {p.url.replace(/^https?:\/\//, "")} <ExternalLink className="size-3" />
                    </a>
                    <p className="truncate text-xs text-muted">{p.notes ?? (p.sentAt ? `Sent ${formatDate(p.sentAt)}` : `Added ${formatDate(p.createdAt)}`)}</p>
                  </div>
                  <StatusBadge kind="preview" value={p.status} />
                  {p.status === "draft" && (
                    <Button size="sm" variant="secondary" loading={send.pending} onClick={() => send.execute(p.id)}>
                      <Send /> Send
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact icon={<Globe />} title="No previews yet" description="Upload the first version when development is ready for review." />
          )}
        </Card>

        <Card>
          <CardHeader title="Final approval" icon={<ThumbsUp />} />
          <div className="p-5">
            {approvals.length ? (
              approvals.map((a) => (
                <div key={a.id} className="flex gap-3 rounded-xl bg-green-soft p-4">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green" />
                  <div className="text-sm">
                    <p className="font-medium text-ink">
                      {a.version} approved by {a.approvedName}
                    </p>
                    <p className="text-xs text-muted">{formatDateTime(a.approvedAt)}</p>
                    <p className="mt-2 text-xs italic text-ink-soft">“{a.confirmation}”</p>
                  </div>
                </div>
              ))
            ) : inReview ? (
              <div className="space-y-3">
                <p className="text-sm text-muted">
                  {inReview.version} is with the client. They approve from their portal — or record an approval you received directly.
                </p>
                <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
                  <DialogTrigger asChild>
                    <Button variant="secondary" size="sm" disabled={openRevisions.length > 0}>
                      Record client approval
                    </Button>
                  </DialogTrigger>
                  <DialogContent title="Record client approval" description={`${inReview.version} — use when the client approved outside the portal (e.g. WhatsApp).`}>
                    <ActionForm action={approveProjectAction.bind(null, projectId)} onSuccess={() => setApproveOpen(false)} className="space-y-4">
                      <TextField name="name" label="Approved by (client name)" required />
                      <label className="flex items-start gap-2.5 rounded-lg bg-cream p-3 text-sm">
                        <input type="checkbox" name="confirm" className="mt-0.5 size-4" />
                        <span>{APPROVAL_CONFIRMATION}</span>
                      </label>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button type="button" variant="secondary">
                            Cancel
                          </Button>
                        </DialogClose>
                        <SubmitButton variant="success">Record approval</SubmitButton>
                      </DialogFooter>
                    </ActionForm>
                  </DialogContent>
                </Dialog>
                {openRevisions.length > 0 && <p className="text-xs text-amber">Close open revision rounds before approval.</p>}
              </div>
            ) : (
              <p className="text-sm text-muted">Send a preview to the client to request approval.</p>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Revision rounds" icon={<MessageSquareWarning />} description={openRevisions.length ? `${openRevisions.length} open` : "All caught up"} />
        <div className="space-y-4 p-5">
          {revisions.length ? revisions.map((r) => <RevisionCard key={r.id} r={r} />) : <EmptyState compact title="No revisions requested" description="Client change requests become revision rounds here." />}
        </div>
      </Card>
    </div>
  );
}

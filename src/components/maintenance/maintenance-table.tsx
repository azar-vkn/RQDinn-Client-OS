"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Wrench } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTrigger, SheetContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/shared/action-form";
import { SelectField, SubmitButton, TextAreaField, TextField } from "@/components/shared/form-fields";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState, InfoRow } from "@/components/shared/layout";
import { FileTile, type FileItem } from "@/components/files/file-manager";
import { createMaintenanceAction, updateMaintenanceAction } from "@/server/actions/maintenance";
import { MAINTENANCE_STATUS_LABEL, MAINTENANCE_TYPES, TASK_PRIORITIES, labelFor } from "@/lib/constants";
import { formatDateTime, timeAgo } from "@/lib/format";

export interface MaintenanceView {
  id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  response: string | null;
  createdAt: Date | string;
  resolvedAt: Date | string | null;
  projectId: string;
  projectName: string;
  clientName: string;
  requestedBy: string | null;
  files: FileItem[];
}

export function NewMaintenanceDialog({ projects, projectId }: { projects?: { id: string; name: string }[]; projectId?: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> New request
        </Button>
      </DialogTrigger>
      <DialogContent title="New maintenance request" description="Log a request received by phone or WhatsApp.">
        <ActionForm action={createMaintenanceAction} onSuccess={() => setOpen(false)} className="space-y-4">
          {projectId ? (
            <input type="hidden" name="projectId" value={projectId} />
          ) : (
            <SelectField name="projectId" label="Project" required placeholder="Choose a project…" options={(projects ?? []).map((p) => ({ value: p.id, label: p.name }))} />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField name="type" label="Update type" options={MAINTENANCE_TYPES} />
            <SelectField name="priority" label="Priority" options={TASK_PRIORITIES.map((p) => ({ value: p, label: p[0].toUpperCase() + p.slice(1) }))} defaultValue="medium" />
          </div>
          <TextField name="title" label="Title" placeholder="Short summary" />
          <TextAreaField name="description" label="Description" required rows={4} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <SubmitButton>Create request</SubmitButton>
          </DialogFooter>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

export function MaintenanceTable({ items, staff, showProject = true }: { items: MaintenanceView[]; staff: { id: string; name: string }[]; showProject?: boolean }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const openId = sp.get("open");
  const selected = items.find((i) => i.id === openId) ?? null;
  const setOpen = (id: string | null) => {
    const next = new URLSearchParams(sp.toString());
    if (id) next.set("open", id);
    else next.delete("open");
    router.replace(`${pathname}?${next}`, { scroll: false });
  };

  if (!items.length) return <EmptyState compact icon={<Wrench />} title="No maintenance requests yet." description="Requests from live clients will appear here." />;

  return (
    <>
      <ul className="divide-y divide-line-soft">
        {items.map((m) => (
          <li key={m.id}>
            <button onClick={() => setOpen(m.id)} className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-cream/40">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cream text-muted">
                <Wrench className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{m.title}</p>
                <p className="truncate text-xs text-muted">
                  {labelFor(MAINTENANCE_TYPES, m.type)}
                  {showProject ? ` · ${m.clientName}` : ""} · {timeAgo(m.createdAt)}
                </p>
              </div>
              {m.priority !== "medium" && <StatusBadge kind="priority" value={m.priority} className="hidden sm:inline-flex" />}
              <StatusBadge kind="maintenance" value={m.status} />
            </button>
          </li>
        ))}
      </ul>
      <Dialog open={!!selected} onOpenChange={(o) => !o && setOpen(null)}>
        {selected && (
          <SheetContent title={selected.title} description={`${selected.clientName} · ${selected.projectName}`}>
            <dl className="divide-y divide-line-soft">
              <InfoRow label="Status">
                <StatusBadge kind="maintenance" value={selected.status} />
              </InfoRow>
              <InfoRow label="Type">{labelFor(MAINTENANCE_TYPES, selected.type)}</InfoRow>
              <InfoRow label="Requested">{formatDateTime(selected.createdAt)}{selected.requestedBy ? ` by ${selected.requestedBy}` : ""}</InfoRow>
              {selected.resolvedAt && <InfoRow label="Completed">{formatDateTime(selected.resolvedAt)}</InfoRow>}
              <InfoRow label="Project">
                <Link href={`/projects/${selected.projectId}?tab=maintenance`} className="text-orange-dark hover:underline">
                  {selected.projectName}
                </Link>
              </InfoRow>
            </dl>
            <div className="mt-5 rounded-xl bg-cream p-4">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Request</p>
              <p className="whitespace-pre-line text-sm">{selected.description}</p>
            </div>
            {selected.files.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {selected.files.map((f) => (
                  <FileTile key={f.id} f={f} />
                ))}
              </div>
            )}
            <ActionForm action={updateMaintenanceAction.bind(null, selected.id)} className="mt-6 space-y-4" key={selected.id}>
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField name="status" label="Status" defaultValue={selected.status} options={Object.entries(MAINTENANCE_STATUS_LABEL).map(([value, label]) => ({ value, label }))} />
                <SelectField name="assignedToId" label="Assigned to" placeholder="Unassigned" options={staff.map((s) => ({ value: s.id, label: s.name }))} />
              </div>
              <TextAreaField name="response" label="Response to client" rows={3} defaultValue={selected.response ?? ""} placeholder="Visible to the client in their portal." />
              <SubmitButton className="w-full">Update request</SubmitButton>
            </ActionForm>
          </SheetContent>
        )}
      </Dialog>
    </>
  );
}

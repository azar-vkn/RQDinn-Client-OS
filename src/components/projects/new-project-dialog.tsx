"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/shared/action-form";
import { SelectField, SubmitButton, TextAreaField, TextField } from "@/components/shared/form-fields";
import { createProjectAction } from "@/server/actions/projects";
import { SERVICE_TYPES } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { rupeesToPaise } from "@/lib/validators";
import { todayISO } from "@/lib/format";

interface WorkflowOption {
  id: string;
  name: string;
  slug?: string;
  serviceType: string;
  steps: { id: string; name: string }[];
}

export function NewProjectDialog({
  clients,
  workflows,
  staff,
  defaultClientId,
  trigger,
}: {
  clients: { id: string; companyName: string }[];
  workflows: WorkflowOption[];
  staff: { id: string; name: string }[];
  defaultClientId?: string;
  trigger?: React.ReactNode;
}) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(sp.get("new") === "1" && !defaultClientId);
  const [clientId, setClientId] = React.useState(defaultClientId ?? sp.get("clientId") ?? "");
  const defaultWf = workflows.find((w) => w.slug === "website") ?? workflows[0];
  const [workflowId, setWorkflowId] = React.useState(defaultWf?.id ?? "");
  const [serviceType, setServiceType] = React.useState(defaultWf?.serviceType ?? "website");
  const [value, setValue] = React.useState("");
  const [annual, setAnnual] = React.useState("");
  const [pct, setPct] = React.useState("50");
  const wf = workflows.find((w) => w.id === workflowId);
  const clientName = clients.find((c) => c.id === clientId)?.companyName;

  const v = rupeesToPaise(value) || 0;
  const a = rupeesToPaise(annual) || 0;
  const adv = Math.round((v * (Number(pct) || 0)) / 100 / 100) * 100;

  const onOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o && sp.get("new")) router.replace(pathname);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus /> New project
          </Button>
        )}
      </DialogTrigger>
      <DialogContent title="New project" description="Pick a workflow — stages, payment schedule and deployment checklist are created automatically." size="lg">
        <ActionForm action={createProjectAction} onSuccess={(d) => { setOpen(false); router.push(`/projects/${(d as { id: string }).id}`); }} className="space-y-5">
          {defaultClientId ? (
            <input type="hidden" name="clientId" value={defaultClientId} />
          ) : (
            <SelectField name="clientId" label="Client" required value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Choose a client…" options={clients.map((c) => ({ value: c.id, label: c.companyName }))} />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              name="workflowId"
              label="Workflow"
              required
              value={workflowId}
              onChange={(e) => {
                setWorkflowId(e.target.value);
                const w = workflows.find((x) => x.id === e.target.value);
                if (w) setServiceType(w.serviceType);
              }}
              options={workflows.map((w) => ({ value: w.id, label: w.name }))}
            />
            <SelectField name="serviceType" label="Service" value={serviceType} onChange={(e) => setServiceType(e.target.value)} options={SERVICE_TYPES} />
          </div>
          {wf && (
            <div className="rounded-xl border border-line-soft bg-cream/60 p-3">
              <p className="mb-2 text-xs font-medium text-muted">{wf.steps.length} stages</p>
              <div className="flex flex-wrap gap-1.5">
                {wf.steps.map((s, i) => (
                  <span key={s.id} className="rounded-full border border-line bg-white px-2.5 py-0.5 text-xs text-ink-soft">
                    {i + 1}. {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          <TextField
            name="name"
            label="Project name"
            required
            key={clientName}
            defaultValue={clientName ? `${clientName} ${serviceType === "website" ? "Official Website" : SERVICE_TYPES.find((s) => s.value === serviceType)?.label ?? "Project"}` : ""}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField name="value" label="Project value (₹)" inputMode="decimal" placeholder="30,000" value={value} onChange={(e) => setValue(e.target.value)} />
            <TextField name="annualValue" label="Annual (₹)" inputMode="decimal" placeholder="6,000" value={annual} onChange={(e) => setAnnual(e.target.value)} hint="Domain, hosting, SSL, maintenance" />
            <TextField name="advancePercent" label="Advance %" type="number" min={0} max={100} value={pct} onChange={(e) => setPct(e.target.value)} />
          </div>
          {(v > 0 || a > 0) && (
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-orange-soft/50 p-3 text-xs">
              <div>
                <p className="text-muted">Advance</p>
                <p className="font-semibold text-ink">{formatMoney(adv)}</p>
              </div>
              <div>
                <p className="text-muted">Final</p>
                <p className="font-semibold text-ink">{formatMoney(v - adv)}</p>
              </div>
              <div>
                <p className="text-muted">Annual</p>
                <p className="font-semibold text-ink">{formatMoney(a)}</p>
              </div>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField name="assignedToId" label="Project lead" options={staff.map((s) => ({ value: s.id, label: s.name }))} placeholder="Unassigned" />
            <TextField name="startDate" label="Start date" type="date" defaultValue={todayISO()} />
            <TextField name="dueDate" label="Target launch" type="date" />
          </div>
          <TextAreaField name="description" label="Scope / description" rows={3} placeholder="What's included — used in the agreement's delivery scope." />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <SubmitButton loadingText="Creating…">Create project</SubmitButton>
          </DialogFooter>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

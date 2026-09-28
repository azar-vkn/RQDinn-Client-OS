"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { useAction } from "@/hooks/use-action";
import { createInvoiceAction } from "@/server/actions/billing";
import { formatMoney, todayISO } from "@/lib/format";
import { rupeesToPaise } from "@/lib/validators";

interface ProjectOption {
  id: string;
  name: string;
  clientId: string;
  value: number;
  annualValue: number;
  milestones: { id: string; label: string; amount: number; status: string; invoiceId: string | null }[];
}

type Line = { description: string; quantity: string; unitPrice: string };

export function InvoiceComposer({
  clients,
  projects,
  defaultClientId,
  defaultProjectId,
  defaultNotes,
  previewNumber,
}: {
  clients: { id: string; companyName: string }[];
  projects: ProjectOption[];
  defaultClientId?: string;
  defaultProjectId?: string;
  defaultNotes: string;
  previewNumber: string;
}) {
  const router = useRouter();
  const [clientId, setClientId] = React.useState(defaultClientId ?? projects.find((p) => p.id === defaultProjectId)?.clientId ?? "");
  const [projectId, setProjectId] = React.useState(defaultProjectId ?? "");
  const [issueDate, setIssueDate] = React.useState(todayISO());
  const due = new Date();
  due.setDate(due.getDate() + 7);
  const [dueDate, setDueDate] = React.useState(due.toISOString().slice(0, 10));
  const [notes, setNotes] = React.useState(defaultNotes);
  const [milestoneIds, setMilestoneIds] = React.useState<string[]>([]);
  const project = projects.find((p) => p.id === projectId);

  const linesFor = (p?: ProjectOption): Line[] => {
    if (!p) return [{ description: "", quantity: "1", unitPrice: "" }];
    const out: Line[] = [];
    if (p.value) out.push({ description: "Website Development", quantity: "1", unitPrice: String(p.value / 100) });
    if (p.annualValue) out.push({ description: "Domain + Hosting + SSL + Maintenance (1 year)", quantity: "1", unitPrice: String(p.annualValue / 100) });
    return out.length ? out : [{ description: "", quantity: "1", unitPrice: "" }];
  };
  const [lines, setLines] = React.useState<Line[]>(() => linesFor(project));

  React.useEffect(() => {
    if (project) setMilestoneIds(project.milestones.filter((m) => !m.invoiceId).map((m) => m.id));
    else setMilestoneIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const total = lines.reduce((s, l) => s + (rupeesToPaise(l.unitPrice) || 0) * (Number(l.quantity) || 0), 0);
  const { execute, pending } = useAction(createInvoiceAction, { onSuccess: (d) => router.push(`/invoices/${d.id}`) });

  const update = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <Card>
        <CardHeader title="Invoice details" description={`Will be numbered ${previewNumber}`} />
        <div className="space-y-5 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Client" required>
              <Select
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  setProjectId("");
                  setLines(linesFor(undefined));
                }}
              >
                <option value="">Choose a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Project">
              <Select
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setLines(linesFor(projects.find((p) => p.id === e.target.value)));
                }}
              >
                <option value="">No project</option>
                {projects
                  .filter((p) => p.clientId === clientId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Invoice date" required>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </Field>
            <Field label="Due date">
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-ink-soft">Line items</p>
            <div className="space-y-2">
              <div className="hidden grid-cols-[1fr_70px_130px_110px_36px] gap-2 px-1 text-xs text-muted sm:grid">
                <span>Description</span>
                <span>Qty</span>
                <span>Unit price (₹)</span>
                <span className="text-right">Amount</span>
                <span />
              </div>
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-[1fr_70px] gap-2 rounded-xl border border-line-soft p-2 sm:grid-cols-[1fr_70px_130px_110px_36px] sm:border-0 sm:p-0">
                  <Input value={l.description} onChange={(e) => update(i, { description: e.target.value })} placeholder="Description" className="col-span-2 sm:col-span-1" aria-label="Description" />
                  <Input value={l.quantity} onChange={(e) => update(i, { quantity: e.target.value })} inputMode="numeric" aria-label="Quantity" />
                  <Input value={l.unitPrice} onChange={(e) => update(i, { unitPrice: e.target.value })} inputMode="decimal" placeholder="0" aria-label="Unit price" />
                  <span className="flex items-center justify-end text-sm font-medium">{formatMoney((rupeesToPaise(l.unitPrice) || 0) * (Number(l.quantity) || 0))}</span>
                  <Button variant="ghost" size="icon" onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))} disabled={lines.length === 1} aria-label="Remove line">
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => setLines((ls) => [...ls, { description: "", quantity: "1", unitPrice: "" }])}>
              <Plus /> Add line
            </Button>
          </div>

          {project && project.milestones.length > 0 && (
            <div>
              <p className="mb-2 text-[13px] font-medium text-ink-soft">Link to payment milestones</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {project.milestones.map((m) => (
                  <label key={m.id} className="flex items-center gap-2.5 rounded-lg border border-line px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={milestoneIds.includes(m.id)}
                      onChange={(e) => setMilestoneIds((ids) => (e.target.checked ? [...ids, m.id] : ids.filter((x) => x !== m.id)))}
                    />
                    <span className="flex-1">{m.label}</span>
                    <span className="text-xs text-muted">{formatMoney(m.amount)}</span>
                  </label>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-muted">Payments recorded against linked milestones update this invoice&apos;s status automatically.</p>
            </div>
          )}

          <Field label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </Field>
        </div>
      </Card>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">RQDINN</p>
          <p className="mt-3 text-sm text-muted">Invoice</p>
          <p className="font-serif text-xl">{previewNumber}</p>
          <div className="my-4 h-px bg-line-soft" />
          <ul className="space-y-1.5 text-sm">
            {lines
              .filter((l) => l.description)
              .map((l, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="truncate text-ink-soft">{l.description}</span>
                  <span>{formatMoney((rupeesToPaise(l.unitPrice) || 0) * (Number(l.quantity) || 0))}</span>
                </li>
              ))}
          </ul>
          <div className="mt-4 flex items-baseline justify-between border-t border-line-soft pt-4">
            <span className="text-sm font-medium">Total</span>
            <span className="font-serif text-3xl">{formatMoney(total)}</span>
          </div>
          <Button
            className="mt-5 w-full"
            size="lg"
            loading={pending}
            loadingText="Generating…"
            disabled={!clientId}
            onClick={() =>
              execute({
                clientId,
                projectId: projectId || null,
                issueDate,
                dueDate: dueDate || null,
                notes,
                items: lines.filter((l) => l.description.trim()).map((l) => ({ description: l.description, quantity: l.quantity, unitPrice: l.unitPrice })),
                milestoneIds,
              })
            }
          >
            Generate invoice
          </Button>
          {!clientId && <p className="mt-2 text-center text-xs text-muted">Choose a client to continue.</p>}
        </Card>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, EyeOff, Info, Plus, Trash2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { useAction } from "@/hooks/use-action";
import { saveWorkflowAction } from "@/server/actions/workflows";
import { PIPELINE_LABEL, PIPELINE_STAGES, SERVICE_TYPES, type PipelineStageValue } from "@/lib/constants";

type StepRow = { name: string; key: string; pipelineStage: PipelineStageValue; clientVisible: boolean; clientLabel: string };

/** Engine-aware step keys. Steps with these keys advance automatically. */
const KNOWN_KEYS: { value: string; label: string }[] = [
  { value: "custom", label: "Custom (manual)" },
  { value: "client_confirmed", label: "Client confirmed" },
  { value: "agreement", label: "Agreement (auto on acceptance)" },
  { value: "advance_payment", label: "Advance payment (auto on payment)" },
  { value: "onboarding", label: "Onboarding (auto on completion)" },
  { value: "content_collection", label: "Content collection" },
  { value: "development", label: "Development (auto on preview sent)" },
  { value: "client_review", label: "Client review (auto on approval)" },
  { value: "final_approval", label: "Final approval" },
  { value: "final_payment", label: "Final payment (auto on payment)" },
  { value: "domain_hosting", label: "Domain & hosting (auto on DNS/SSL)" },
  { value: "deployment", label: "Deployment / launch (auto on go-live)" },
  { value: "maintenance", label: "Maintenance" },
];

export function WorkflowEditor({
  id,
  initial,
  inUse,
}: {
  id: string | null;
  initial: { name: string; description: string | null; serviceType: string; steps: StepRow[] };
  inUse: boolean;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(initial.name);
  const [description, setDescription] = React.useState(initial.description ?? "");
  const [serviceType, setServiceType] = React.useState(initial.serviceType);
  const [steps, setSteps] = React.useState<StepRow[]>(initial.steps.length ? initial.steps : [{ name: "", key: "custom", pipelineStage: "new", clientVisible: true, clientLabel: "" }]);
  const { execute, pending } = useAction(saveWorkflowAction, { onSuccess: (d) => router.push(`/workflows/${d.id}`) });

  const update = (i: number, patch: Partial<StepRow>) => setSteps((s) => s.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const move = (i: number, dir: -1 | 1) =>
    setSteps((s) => {
      const j = i + dir;
      if (j < 0 || j >= s.length) return s;
      const copy = [...s];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  return (
    <div className="space-y-5">
      {inUse && (
        <div className="flex gap-2.5 rounded-xl bg-sky-soft/70 p-3.5 text-sm text-sky">
          <Info className="mt-0.5 size-4 shrink-0" />
          Projects already using this workflow keep their current stages. Changes apply to new projects.
        </div>
      )}
      <Card>
        <CardHeader title="Workflow" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Restaurant Website" />
          </Field>
          <Field label="Service">
            <Select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
              {SERVICE_TYPES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Steps" description="Engine keys let business events (payments, approvals, launch) move steps automatically." />
        <ol className="divide-y divide-line-soft">
          {steps.map((s, i) => (
            <li key={i} className="grid gap-3 px-5 py-4 lg:grid-cols-[32px_1.3fr_1.3fr_1fr_1fr_auto] lg:items-center">
              <span className="flex size-7 items-center justify-center rounded-full bg-cream-dark text-xs font-semibold text-ink-soft">{i + 1}</span>
              <Input value={s.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Step name" aria-label="Step name" />
              <Select value={KNOWN_KEYS.some((k) => k.value === s.key) ? s.key : "custom"} onChange={(e) => update(i, { key: e.target.value })} aria-label="Engine key">
                {KNOWN_KEYS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </Select>
              <Select value={s.pipelineStage} onChange={(e) => update(i, { pipelineStage: e.target.value as PipelineStageValue })} aria-label="Pipeline column">
                {PIPELINE_STAGES.map((p) => (
                  <option key={p} value={p}>
                    {PIPELINE_LABEL[p]}
                  </option>
                ))}
              </Select>
              <Input value={s.clientLabel} onChange={(e) => update(i, { clientLabel: e.target.value })} placeholder="Client label (optional)" aria-label="Client label" disabled={!s.clientVisible} />
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon-sm" onClick={() => update(i, { clientVisible: !s.clientVisible })} title={s.clientVisible ? "Visible to client" : "Hidden from client"}>
                  {s.clientVisible ? <Eye /> : <EyeOff className="text-subtle" />}
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                  <ArrowUp />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => move(i, 1)} disabled={i === steps.length - 1} aria-label="Move down">
                  <ArrowDown />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => setSteps((x) => x.filter((_, idx) => idx !== i))} disabled={steps.length === 1} aria-label="Remove step">
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-5 py-4">
          <Button variant="secondary" size="sm" onClick={() => setSteps((s) => [...s, { name: "", key: "custom", pipelineStage: s.at(-1)?.pipelineStage ?? "new", clientVisible: true, clientLabel: "" }])}>
            <Plus /> Add step
          </Button>
          <Button
            loading={pending}
            onClick={() =>
              execute(id, {
                name,
                description: description || null,
                serviceType,
                steps: steps.map((s) => ({ ...s, clientLabel: s.clientLabel || null })),
              })
            }
          >
            Save workflow
          </Button>
        </div>
      </Card>
    </div>
  );
}

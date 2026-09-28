"use client";

import * as React from "react";
import { Check, ChevronDown, Circle, Clock, ListPlus, Loader2, MessageSquareText } from "lucide-react";
import { NewTaskButton } from "@/components/tasks/task-list";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/shared/action-form";
import { SelectField, SubmitButton, TextAreaField, TextField } from "@/components/shared/form-fields";
import { useAction } from "@/hooks/use-action";
import { setStepStatusAction, updateStepAction } from "@/server/actions/projects";
import { STEP_STATUS_LABEL, STEP_STATUSES, type StepStatusValue } from "@/lib/constants";
import { formatDate, formatDateTime, toDateInput } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface StepView {
  id: string;
  name: string;
  key: string;
  status: StepStatusValue;
  notes: string | null;
  assignedToId: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  startedAt: Date | string | null;
  completedAt: Date | string | null;
}

function StepIcon({ status, current }: { status: StepStatusValue; current: boolean }) {
  if (status === "completed")
    return (
      <span className="flex size-7 items-center justify-center rounded-full bg-green text-white">
        <Check className="size-4" strokeWidth={3} />
      </span>
    );
  if (status === "in_progress")
    return (
      <span className={cn("flex size-7 items-center justify-center rounded-full bg-orange text-white", current && "ring-4 ring-orange/20")}>
        <Loader2 className="size-3.5 animate-[spin_2.4s_linear_infinite]" />
      </span>
    );
  if (status === "waiting")
    return (
      <span className="flex size-7 items-center justify-center rounded-full bg-amber-soft text-amber ring-1 ring-amber/30">
        <Clock className="size-3.5" />
      </span>
    );
  return (
    <span className="flex size-7 items-center justify-center rounded-full border-[1.5px] border-line bg-white text-subtle">
      <Circle className="size-2 fill-current" />
    </span>
  );
}

export interface StageTask {
  id: string;
  title: string;
  status: string;
  projectStepId: string | null;
}

export function StageTracker({
  projectId,
  steps,
  currentId,
  staff,
  tasks = [],
}: {
  projectId: string;
  steps: StepView[];
  currentId: string | null;
  staff: { id: string; name: string }[];
  tasks?: StageTask[];
}) {
  const stageOptions = steps.map((s) => ({ id: s.id, name: s.name }));
  const { execute, pending } = useAction(setStepStatusAction, { success: "Stage updated." });
  const [editing, setEditing] = React.useState<StepView | null>(null);

  return (
    <>
      <ol className={cn("relative", pending && "opacity-70")}>
        {steps.map((s, i) => {
          const current = s.id === currentId;
          return (
            <li key={s.id} className="relative flex gap-4 pb-5 last:pb-0">
              {i < steps.length - 1 && (
                <span className={cn("absolute left-[13px] top-8 h-[calc(100%-28px)] w-0.5 rounded-full", s.status === "completed" ? "bg-green/60" : "bg-line")} />
              )}
              <StepIcon status={s.status} current={current} />
              <div className={cn("-mt-0.5 min-w-0 flex-1 rounded-xl px-3 py-2", current && "bg-orange-soft/50 ring-1 ring-orange/15")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className={cn("text-sm font-medium", s.status === "not_started" ? "text-muted" : "text-ink")}>
                      <span className="mr-1.5 text-subtle">{i + 1}.</span>
                      {s.name}
                      {current && <span className="ml-2 text-xs font-semibold uppercase tracking-wider text-orange">Current</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {s.status === "completed" && s.completedAt
                        ? `Completed ${formatDateTime(s.completedAt)}`
                        : s.startedAt
                          ? `Started ${formatDate(s.startedAt)}`
                          : "Not started"}
                      {s.assigneeName ? ` · ${s.assigneeName}` : ""}
                      {s.dueDate ? ` · Due ${formatDate(s.dueDate, "d MMM")}` : ""}
                    </p>
                    {s.notes && <p className="mt-1.5 whitespace-pre-line text-xs text-ink-soft">{s.notes}</p>}
                    {tasks.some((t) => t.projectStepId === s.id) && (
                      <ul className="mt-2 space-y-1">
                        {tasks
                          .filter((t) => t.projectStepId === s.id)
                          .map((t) => (
                            <li key={t.id} className="flex items-center gap-1.5 text-xs">
                              {t.status === "completed" ? <Check className="size-3 text-green" strokeWidth={3} /> : <Circle className="size-2.5 text-subtle" />}
                              <span className={t.status === "completed" ? "text-muted line-through" : "text-ink-soft"}>{t.title}</span>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <NewTaskButton
                      projectId={projectId}
                      staff={staff}
                      stages={stageOptions}
                      defaultStageId={s.id}
                      trigger={
                        <button className="rounded-md p-1.5 text-subtle hover:bg-white hover:text-ink" aria-label={`Add task to ${s.name}`} title="Add task to this stage">
                          <ListPlus className="size-4" />
                        </button>
                      }
                    />
                    <button onClick={() => setEditing(s)} className="rounded-md p-1.5 text-subtle hover:bg-white hover:text-ink" aria-label={`Notes for ${s.name}`}>
                      <MessageSquareText className="size-4" />
                    </button>
                    <Dropdown>
                      <DropdownTrigger asChild>
                        <button className="flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-xs font-medium text-ink-soft hover:border-[#d9d1c4]">
                          {STEP_STATUS_LABEL[s.status]} <ChevronDown className="size-3" />
                        </button>
                      </DropdownTrigger>
                      <DropdownContent>
                        {STEP_STATUSES.map((st) => (
                          <DropdownItem key={st} disabled={st === s.status} onSelect={() => execute(projectId, s.id, st)}>
                            {STEP_STATUS_LABEL[st]}
                          </DropdownItem>
                        ))}
                      </DropdownContent>
                    </Dropdown>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <DialogContent title={editing.name} description="Stage owner, due date and notes.">
            <ActionForm action={updateStepAction.bind(null, projectId, editing.id)} onSuccess={() => setEditing(null)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField name="assignedToId" label="Assigned person" placeholder="Unassigned" options={staff.map((x) => ({ value: x.id, label: x.name }))} defaultValue={editing.assignedToId ?? ""} />
                <TextField name="dueDate" label="Due date" type="date" defaultValue={toDateInput(editing.dueDate)} />
              </div>
              <TextAreaField name="notes" label="Notes" rows={4} defaultValue={editing.notes ?? ""} />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary">
                    Cancel
                  </Button>
                </DialogClose>
                <SubmitButton>Save</SubmitButton>
              </DialogFooter>
            </ActionForm>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

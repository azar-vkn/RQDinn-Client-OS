"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, CheckSquare, Circle, CircleCheck, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import type { TaskListItem } from "@/server/services/tasks";
import { createTaskAction, deleteTaskAction, setTaskStatusAction, updateTaskAction } from "@/server/actions/tasks";
import { useAction } from "@/hooks/use-action";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/misc";
import { ActionForm } from "@/components/shared/action-form";
import { SelectField, SubmitButton, TextAreaField, TextField } from "@/components/shared/form-fields";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/layout";
import { TASK_PRIORITIES, TASK_STATUS_LABEL, TASK_STATUSES } from "@/lib/constants";
import { daysUntil, formatDate, toDateInput } from "@/lib/format";
import { cn } from "@/lib/utils";

type Staff = { id: string; name: string };
type TaskRow = Omit<TaskListItem, "createdAt" | "completedAt" | "projectStepId"> & { createdAt?: unknown; completedAt?: unknown; projectStepId?: string | null };
type StageOption = { id: string; name: string };
/** Project stages, when tasks are shown inside a single project. */
const StagesContext = React.createContext<StageOption[]>([]);

function TaskForm({ task, projectId, projects, staff, onDone, defaultStageId }: { task?: TaskRow; projectId?: string; projects?: { id: string; name: string }[]; staff: Staff[]; onDone: () => void; defaultStageId?: string }) {
  const stages = React.useContext(StagesContext);
  const action = task ? updateTaskAction.bind(null, task.id) : createTaskAction;
  return (
    <ActionForm action={action} onSuccess={onDone} className="space-y-4">
      {task ? null : projectId ? (
        <input type="hidden" name="projectId" value={projectId} />
      ) : (
        <SelectField name="projectId" label="Project" required placeholder="Choose a project…" options={(projects ?? []).map((p) => ({ value: p.id, label: p.name }))} />
      )}
      <TextField name="title" label="Title" required defaultValue={task?.title} autoFocus placeholder="e.g. Build menu section" />
      <TextAreaField name="description" label="Description" rows={3} defaultValue={task?.description ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField name="assigneeId" label="Assignee" placeholder="Unassigned" options={staff.map((s) => ({ value: s.id, label: s.name }))} defaultValue={task?.assigneeId ?? ""} />
        <TextField name="dueDate" label="Due date" type="date" defaultValue={toDateInput(task?.dueDate)} />
        <SelectField name="priority" label="Priority" options={TASK_PRIORITIES.map((p) => ({ value: p, label: p[0].toUpperCase() + p.slice(1) }))} defaultValue={task?.priority ?? "medium"} />
        <SelectField name="status" label="Status" options={TASK_STATUSES.map((s) => ({ value: s, label: TASK_STATUS_LABEL[s] }))} defaultValue={task?.status ?? "todo"} />
      </div>
      {stages.length > 0 && (
        <SelectField name="projectStepId" label="Stage" placeholder="No specific stage" options={stages.map((s) => ({ value: s.id, label: s.name }))} defaultValue={task?.projectStepId ?? defaultStageId ?? ""} />
      )}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="secondary">
            Cancel
          </Button>
        </DialogClose>
        <SubmitButton>{task ? "Save task" : "Add task"}</SubmitButton>
      </DialogFooter>
    </ActionForm>
  );
}

export function NewTaskButton({
  projectId,
  projects,
  staff,
  size = "md",
  stages,
  defaultStageId,
  trigger,
}: {
  projectId?: string;
  projects?: { id: string; name: string }[];
  staff: Staff[];
  size?: "sm" | "md";
  stages?: StageOption[];
  defaultStageId?: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <StagesContext.Provider value={stages ?? []}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger ?? (
            <Button size={size}>
              <Plus /> New task
            </Button>
          )}
        </DialogTrigger>
        <DialogContent title="New task">
          <TaskForm projectId={projectId} projects={projects} staff={staff} onDone={() => setOpen(false)} defaultStageId={defaultStageId} />
        </DialogContent>
      </Dialog>
    </StagesContext.Provider>
  );
}

function TaskRowView({ t, staff, showProject }: { t: TaskRow; staff: Staff[]; showProject: boolean }) {
  const [editing, setEditing] = React.useState(false);
  const status = useAction(setTaskStatusAction);
  const del = useAction(deleteTaskAction, { success: "Task deleted." });
  const done = t.status === "completed";
  const due = daysUntil(t.dueDate);
  const stage = React.useContext(StagesContext).find((s) => s.id === t.projectStepId);
  return (
    <li className={cn("group flex items-start gap-3 px-5 py-3.5 transition hover:bg-cream/40", status.pending && "opacity-60")}>
      <button
        onClick={() => status.execute(t.id, done ? "todo" : "completed")}
        className="mt-0.5 shrink-0 text-subtle transition hover:text-green"
        aria-label={done ? "Mark as not done" : "Mark as done"}
        disabled={status.pending}
      >
        {done ? <CircleCheck className="size-5 text-green" /> : <Circle className="size-5" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm", done ? "text-muted line-through" : "text-ink")}>{t.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {showProject && (
            <Link href={`/projects/${t.projectId}?tab=tasks`} className="hover:text-ink">
              {t.clientName} · {t.projectName}
            </Link>
          )}
          {stage && <span className="rounded bg-cream-dark px-1.5 py-0.5 text-[11px] text-ink-soft">{stage.name}</span>}
          {t.dueDate && (
            <span className={cn("flex items-center gap-1", !done && due !== null && due < 0 && "text-danger", !done && due !== null && due >= 0 && due <= 1 && "text-amber")}>
              <CalendarDays className="size-3.5" /> {formatDate(t.dueDate, "d MMM")}
            </span>
          )}
          {t.priority !== "medium" && <StatusBadge kind="priority" value={t.priority} />}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden sm:inline-flex">
          <StatusBadge kind="task" value={t.status} />
        </span>
        {t.assigneeName && <Avatar name={t.assigneeName} size="sm" />}
        <Dropdown>
          <DropdownTrigger className="rounded-md p-1 text-muted hover:bg-cream hover:text-ink" aria-label="Task actions">
            <MoreHorizontal className="size-4" />
          </DropdownTrigger>
          <DropdownContent>
            <DropdownItem onSelect={() => setEditing(true)}>
              <Pencil /> Edit
            </DropdownItem>
            <DropdownSeparator />
            <DropdownLabel>Set status</DropdownLabel>
            {TASK_STATUSES.map((s) => (
              <DropdownItem key={s} onSelect={() => status.execute(t.id, s)} disabled={s === t.status}>
                <CheckSquare /> {TASK_STATUS_LABEL[s]}
              </DropdownItem>
            ))}
            <DropdownSeparator />
            <DropdownItem destructive onSelect={() => confirm("Delete this task?") && del.execute(t.id)}>
              <Trash2 /> Delete
            </DropdownItem>
          </DropdownContent>
        </Dropdown>
      </div>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent title="Edit task">
          <TaskForm task={t} staff={staff} onDone={() => setEditing(false)} />
        </DialogContent>
      </Dialog>
    </li>
  );
}

export function TaskList({ tasks, staff, showProject = false, empty = "No tasks yet.", stages }: { tasks: TaskRow[]; staff: Staff[]; showProject?: boolean; empty?: string; stages?: StageOption[] }) {
  return (
    <StagesContext.Provider value={stages ?? []}>
      <TaskListInner tasks={tasks} staff={staff} showProject={showProject} empty={empty} />
    </StagesContext.Provider>
  );
}

function TaskListInner({ tasks, staff, showProject, empty }: { tasks: TaskRow[]; staff: Staff[]; showProject: boolean; empty: string }) {
  const [showDone, setShowDone] = React.useState(false);
  const open = tasks.filter((t) => t.status !== "completed");
  const done = tasks.filter((t) => t.status === "completed");
  if (!tasks.length) return <EmptyState compact icon={<CheckSquare />} title={empty} description="Break the work into tasks so nothing slips." />;
  return (
    <div>
      <ul className="divide-y divide-line-soft">
        {open.map((t) => (
          <TaskRowView key={t.id} t={t} staff={staff} showProject={showProject} />
        ))}
      </ul>
      {open.length === 0 && <p className="px-5 py-6 text-center text-sm text-muted">All tasks are done. 🎉</p>}
      {done.length > 0 && (
        <div className="border-t border-line-soft">
          <button onClick={() => setShowDone((s) => !s)} className="w-full px-5 py-3 text-left text-xs font-medium text-muted hover:text-ink">
            {showDone ? "Hide" : "Show"} {done.length} completed
          </button>
          {showDone && (
            <ul className="divide-y divide-line-soft">
              {done.map((t) => (
                <TaskRowView key={t.id} t={t} staff={staff} showProject={showProject} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

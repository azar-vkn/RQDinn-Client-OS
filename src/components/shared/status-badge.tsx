import { Badge } from "@/components/ui/badge";
import {
  CLIENT_STATUS_LABEL,
  INVOICE_STATUS_LABEL,
  MAINTENANCE_STATUS_LABEL,
  PIPELINE_LABEL,
  REVISION_STATUS_LABEL,
  STEP_STATUS_LABEL,
  TASK_STATUS_LABEL,
  type PipelineStageValue,
} from "@/lib/constants";

type Tone = "neutral" | "orange" | "green" | "amber" | "red" | "sky" | "dark" | "outline";

const MAPS: Record<string, { label: Record<string, string>; tone: Record<string, Tone> }> = {
  client: {
    label: CLIENT_STATUS_LABEL,
    tone: { lead: "sky", active: "orange", on_hold: "amber", completed: "green", maintenance: "green" },
  },
  step: {
    label: STEP_STATUS_LABEL,
    tone: { not_started: "outline", in_progress: "orange", waiting: "amber", completed: "green" },
  },
  task: {
    label: TASK_STATUS_LABEL,
    tone: { todo: "outline", in_progress: "orange", waiting: "amber", completed: "green" },
  },
  invoice: {
    label: INVOICE_STATUS_LABEL,
    tone: { draft: "outline", sent: "sky", partially_paid: "amber", paid: "green", void: "neutral" },
  },
  milestone: {
    label: { pending: "Pending", paid: "Paid" },
    tone: { pending: "amber", paid: "green" },
  },
  payment: {
    label: { paid: "Paid", partial: "Partially paid", pending: "Payment pending", none: "No schedule" },
    tone: { paid: "green", partial: "amber", pending: "amber", none: "outline" },
  },
  agreement: {
    label: { draft: "Draft", sent: "Sent", accepted: "Accepted" },
    tone: { draft: "outline", sent: "sky", accepted: "green" },
  },
  revision: {
    label: REVISION_STATUS_LABEL,
    tone: { pending: "amber", in_progress: "orange", completed: "green" },
  },
  preview: {
    label: { draft: "Draft", in_review: "In review", changes_requested: "Changes requested", approved: "Approved", superseded: "Superseded" },
    tone: { draft: "outline", in_review: "orange", changes_requested: "amber", approved: "green", superseded: "neutral" },
  },
  maintenance: {
    label: MAINTENANCE_STATUS_LABEL,
    tone: { new: "orange", in_progress: "sky", waiting_client: "amber", completed: "green" },
  },
  onboarding: {
    label: { not_started: "Not started", in_progress: "In progress", completed: "Completed" },
    tone: { not_started: "outline", in_progress: "orange", completed: "green" },
  },
  phase: {
    label: { active: "Active", live: "Live", maintenance: "Maintenance", on_hold: "On hold", cancelled: "Cancelled" },
    tone: { active: "orange", live: "green", maintenance: "green", on_hold: "amber", cancelled: "neutral" },
  },
  priority: {
    label: { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" },
    tone: { low: "outline", medium: "neutral", high: "amber", urgent: "red" },
  },
  document: {
    label: { draft: "Draft", sent: "Sent", accepted: "Accepted", paid: "Paid", partially_paid: "Partially paid", void: "Void", issued: "Issued", final: "Final" },
    tone: { draft: "outline", sent: "sky", accepted: "green", paid: "green", partially_paid: "amber", void: "neutral", issued: "green", final: "neutral" },
  },
};

export function StatusBadge({ kind, value, className }: { kind: keyof typeof MAPS; value: string | null | undefined; className?: string }) {
  if (!value) return null;
  const m = MAPS[kind];
  return (
    <Badge tone={m.tone[value] ?? "neutral"} dot={kind !== "priority"} className={className}>
      {m.label[value] ?? value.replace(/_/g, " ")}
    </Badge>
  );
}

const STAGE_TONE: Record<PipelineStageValue, Tone> = {
  new: "sky",
  onboarding: "amber",
  development: "orange",
  review: "orange",
  payment_pending: "amber",
  ready_to_launch: "green",
  live: "green",
};

export function StageBadge({ stage, className }: { stage: PipelineStageValue; className?: string }) {
  return (
    <Badge tone={STAGE_TONE[stage]} dot className={className}>
      {PIPELINE_LABEL[stage]}
    </Badge>
  );
}

export function DemoBadge() {
  return (
    <Badge tone="outline" className="px-1.5 py-0 text-[10px] uppercase tracking-wider">
      Demo
    </Badge>
  );
}

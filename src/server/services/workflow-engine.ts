/**
 * Workflow engine.
 *
 * Projects copy their workflow's steps into `project_steps`. Business events
 * (payment recorded, onboarding completed, client approved…) are translated into
 * step transitions by semantic step key, so any workflow — website, QR ordering,
 * CRM — advances automatically as long as its steps use the known keys. Steps
 * with unknown keys are simply advanced manually.
 */
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, type DbOrTx } from "@/server/db/client";
import { projectSteps, projects, type ProjectStep, type StepStatus } from "@/server/db/schema";
import { STEP_KEYS as K } from "@/lib/constants";
import { logActivity } from "./activity";

export type WorkflowEvent =
  | "project.created"
  | "agreement.generated"
  | "agreement.sent"
  | "agreement.accepted"
  | "payment.advance_received"
  | "payment.final_received"
  | "onboarding.started"
  | "onboarding.completed"
  | "onboarding.completed_with_outstanding"
  | "content.completed"
  | "preview.sent"
  | "revision.requested"
  | "revision.completed"
  | "project.approved"
  | "deployment.infrastructure_ready"
  | "project.launched"
  | "maintenance.started";

type Effect = { complete?: string[]; start?: string[]; wait?: string[] };

const EFFECTS: Record<WorkflowEvent, Effect> = {
  "project.created": { complete: [K.confirmed], start: [K.agreement] },
  "agreement.generated": { start: [K.agreement] },
  "agreement.sent": { wait: [K.agreement] },
  "agreement.accepted": { complete: [K.agreement] },
  "payment.advance_received": { complete: [K.advancePayment] },
  "payment.final_received": { complete: [K.finalPayment] },
  "onboarding.started": { start: [K.onboarding] },
  "onboarding.completed": { complete: [K.onboarding, K.content] },
  "onboarding.completed_with_outstanding": { complete: [K.onboarding], start: [K.content] },
  "content.completed": { complete: [K.content] },
  "preview.sent": { complete: [K.content, K.development], start: [K.review] },
  "revision.requested": { start: [K.review] },
  "revision.completed": { start: [K.review] },
  "project.approved": { complete: [K.review, K.approval] },
  "deployment.infrastructure_ready": { complete: [K.domainHosting] },
  "project.launched": { complete: [K.domainHosting, K.deployment, K.launch] },
  "maintenance.started": { start: [K.maintenance] },
};

export async function getSteps(projectId: string, tx: DbOrTx = db) {
  return tx.select().from(projectSteps).where(eq(projectSteps.projectId, projectId)).orderBy(asc(projectSteps.position));
}

function transition(step: ProjectStep, status: StepStatus): Partial<ProjectStep> {
  const now = new Date();
  return {
    status,
    startedAt: status !== "not_started" ? (step.startedAt ?? now) : null,
    completedAt: status === "completed" ? (step.completedAt ?? now) : null,
  };
}

/**
 * Current step = the furthest step that is actively being worked on
 * (in progress / waiting); otherwise the first step not yet completed.
 */
export function currentStepOf(steps: ProjectStep[]) {
  const active = [...steps].reverse().find((s) => s.status === "in_progress" || s.status === "waiting");
  return active ?? steps.find((s) => s.status !== "completed") ?? null;
}

export async function recompute(projectId: string, tx: DbOrTx = db) {
  const steps = await getSteps(projectId, tx);
  // An ongoing maintenance stage means delivery is finished.
  const done = steps.filter((s) => s.status === "completed" || (s.key === K.maintenance && s.status === "in_progress")).length;
  const progress = steps.length ? Math.round((done / steps.length) * 100) : 0;
  const current = currentStepOf(steps);
  await tx.update(projects).set({ progress, currentStepId: current?.id ?? null }).where(eq(projects.id, projectId));
  return { progress, current };
}

/** Manually set a step's status (from the Stages panel). */
export async function setStepStatus(
  projectId: string,
  stepId: string,
  status: StepStatus,
  actorId: string | null,
  tx: DbOrTx = db,
) {
  const [step] = await tx
    .select()
    .from(projectSteps)
    .where(and(eq(projectSteps.id, stepId), eq(projectSteps.projectId, projectId)));
  if (!step) throw new Error("Step not found");
  if (step.status === status) return;
  await tx.update(projectSteps).set(transition(step, status)).where(eq(projectSteps.id, stepId));
  if (status === "completed") await startNextAfter(projectId, step.position, tx);
  const [p] = await tx.select({ clientId: projects.clientId }).from(projects).where(eq(projects.id, projectId));
  await logActivity(
    {
      projectId,
      clientId: p?.clientId,
      actorId,
      event: "step.status",
      description: `${step.name} marked ${status.replace("_", " ")}`,
      clientVisible: status === "completed" && step.clientVisible,
    },
    tx,
  );
  await recompute(projectId, tx);
}

async function startNextAfter(projectId: string, position: number, tx: DbOrTx) {
  const steps = await getSteps(projectId, tx);
  const next = steps.find((s) => s.position > position && s.status !== "completed");
  if (next && next.status === "not_started") {
    await tx.update(projectSteps).set(transition(next, "in_progress")).where(eq(projectSteps.id, next.id));
  }
}

/** Apply a business event to a project's steps. Unknown keys are ignored. */
export async function handleEvent(projectId: string, event: WorkflowEvent, tx: DbOrTx = db) {
  const effect = EFFECTS[event];
  const steps = await getSteps(projectId, tx);
  const byKey = (keys?: string[]) => steps.filter((s) => keys?.includes(s.key));

  const toComplete = byKey(effect.complete).filter((s) => s.status !== "completed");
  if (toComplete.length) {
    const now = new Date();
    for (const s of toComplete) {
      await tx
        .update(projectSteps)
        .set({ status: "completed", startedAt: s.startedAt ?? now, completedAt: now })
        .where(eq(projectSteps.id, s.id));
    }
    const maxPos = Math.max(...toComplete.map((s) => s.position));
    await startNextAfter(projectId, maxPos, tx);
  }

  const toStart = byKey(effect.start).filter((s) => s.status === "not_started" || s.status === "waiting");
  if (toStart.length) {
    await tx
      .update(projectSteps)
      .set({ status: "in_progress" })
      .where(inArray(projectSteps.id, toStart.map((s) => s.id)));
    for (const s of toStart.filter((x) => !x.startedAt)) {
      await tx.update(projectSteps).set({ startedAt: new Date() }).where(eq(projectSteps.id, s.id));
    }
  }

  const toWait = byKey(effect.wait).filter((s) => s.status !== "completed");
  if (toWait.length) {
    await tx
      .update(projectSteps)
      .set({ status: "waiting" })
      .where(inArray(projectSteps.id, toWait.map((s) => s.id)));
  }

  return recompute(projectId, tx);
}

export function stepHasKey(steps: { key: string }[], key: string) {
  return steps.some((s) => s.key === key);
}

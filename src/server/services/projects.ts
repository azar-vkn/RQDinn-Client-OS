import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, type DbOrTx } from "@/server/db/client";
import {
  clients,
  deploymentItems,
  launches,
  onboardingForms,
  paymentMilestones,
  projectSteps,
  projects,
  users,
  workflowSteps,
  workflows,
} from "@/server/db/schema";
import { projectScope } from "@/server/auth/permissions";
import type { Actor } from "@/server/auth/session";
import { DEFAULT_DEPLOYMENT_CHECKLIST, PIPELINE_STAGES, type PipelineStageValue } from "@/lib/constants";
import { invalid, notFound } from "@/server/errors";
import { logActivity } from "./activity";
import { handleEvent } from "./workflow-engine";

export interface CreateProjectInput {
  clientId: string;
  workflowId: string;
  name: string;
  serviceType: string;
  description?: string | null;
  value: number; // paise
  annualValue: number; // paise
  advancePercent?: number;
  assignedToId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  isDemo?: boolean;
}

/** Create a project from a workflow: steps, payment schedule, deployment checklist, onboarding form. */
export async function createProject(input: CreateProjectInput, actor: Pick<Actor, "id"> | null, tx: DbOrTx = db) {
  const [wf] = await tx.select().from(workflows).where(eq(workflows.id, input.workflowId));
  if (!wf) throw invalid("Please choose a workflow.");
  const [client] = await tx.select().from(clients).where(eq(clients.id, input.clientId));
  if (!client) throw notFound("Client");
  const steps = await tx.select().from(workflowSteps).where(eq(workflowSteps.workflowId, wf.id)).orderBy(asc(workflowSteps.position));
  if (!steps.length) throw invalid("This workflow has no steps yet.");

  const [project] = await tx
    .insert(projects)
    .values({
      clientId: input.clientId,
      workflowId: wf.id,
      name: input.name,
      serviceType: input.serviceType,
      description: input.description,
      value: input.value,
      annualValue: input.annualValue,
      assignedToId: input.assignedToId || null,
      startDate: input.startDate || null,
      dueDate: input.dueDate || null,
      isDemo: input.isDemo ?? false,
    })
    .returning();

  await tx.insert(projectSteps).values(
    steps.map((s, i) => ({
      projectId: project.id,
      workflowStepId: s.id,
      position: i + 1,
      name: s.name,
      key: s.key,
      pipelineStage: s.pipelineStage,
      clientVisible: s.clientVisible,
      clientLabel: s.clientLabel,
      assignedToId: input.assignedToId || null,
    })),
  );

  // Payment schedule: advance + final for the build, plus annual renewal.
  const pct = Math.min(100, Math.max(0, input.advancePercent ?? 50));
  const advance = Math.round((input.value * pct) / 100 / 100) * 100;
  const schedule: (typeof paymentMilestones.$inferInsert)[] = [];
  if (input.value > 0) {
    if (advance > 0) schedule.push({ projectId: project.id, position: 1, label: "Advance payment", kind: "advance", amount: advance });
    if (input.value - advance > 0)
      schedule.push({ projectId: project.id, position: 2, label: "Final payment", kind: "final", amount: input.value - advance });
  }
  if (input.annualValue > 0)
    schedule.push({ projectId: project.id, position: 3, label: "Annual hosting & maintenance", kind: "annual", amount: input.annualValue });
  if (schedule.length) await tx.insert(paymentMilestones).values(schedule);

  await tx.insert(deploymentItems).values(
    DEFAULT_DEPLOYMENT_CHECKLIST.map((d, i) => ({ projectId: project.id, position: i + 1, key: d.key, label: d.label, required: d.required })),
  );
  await tx.insert(onboardingForms).values({ projectId: project.id });

  if (client.status === "lead") await tx.update(clients).set({ status: "active" }).where(eq(clients.id, client.id));

  await logActivity(
    {
      clientId: client.id,
      projectId: project.id,
      actorId: actor?.id,
      event: "project.created",
      description: `Project “${project.name}” created with the ${wf.name} workflow`,
      clientVisible: true,
    },
    tx,
  );
  await handleEvent(project.id, "project.created", tx);
  return project;
}

const currentStep = alias(projectSteps, "current_step");
const assignee = alias(users, "assignee");

export const paidSql = sql<number>`(select coalesce(sum(m.amount),0)::int from payment_milestones m where m.project_id = ${projects.id} and m.status = 'paid')`;
export const scheduledSql = sql<number>`(select coalesce(sum(m.amount),0)::int from payment_milestones m where m.project_id = ${projects.id})`;
const pendingCoreSql = sql<number>`(select coalesce(sum(m.amount),0)::int from payment_milestones m where m.project_id = ${projects.id} and m.status = 'pending')`;

export interface ProjectListFilters {
  q?: string;
  stage?: string;
  clientId?: string;
  phase?: string;
}

export async function listProjects(actor: Actor, filters: ProjectListFilters = {}) {
  const conds: (SQL | undefined)[] = [projectScope(actor)];
  if (filters.q) conds.push(or(ilike(projects.name, `%${filters.q}%`), ilike(clients.companyName, `%${filters.q}%`)));
  if (filters.clientId) conds.push(eq(projects.clientId, filters.clientId));
  if (filters.phase) conds.push(eq(projects.phase, filters.phase as never));

  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      serviceType: projects.serviceType,
      phase: projects.phase,
      progress: projects.progress,
      value: projects.value,
      annualValue: projects.annualValue,
      dueDate: projects.dueDate,
      createdAt: projects.createdAt,
      isDemo: projects.isDemo,
      clientId: clients.id,
      clientName: clients.companyName,
      clientIndustry: clients.industry,
      stepName: currentStep.name,
      stepKey: currentStep.key,
      stepStatus: currentStep.status,
      stepStage: currentStep.pipelineStage,
      assigneeName: assignee.name,
      assigneeId: assignee.id,
      paid: paidSql,
      scheduled: scheduledSql,
      pending: pendingCoreSql,
    })
    .from(projects)
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .leftJoin(currentStep, eq(currentStep.id, projects.currentStepId))
    .leftJoin(assignee, eq(assignee.id, projects.assignedToId))
    .where(and(...conds.filter(Boolean)))
    .orderBy(desc(projects.updatedAt));

  const mapped = rows.map((r) => ({
    ...r,
    stage: stageOf(r.phase, r.stepStage),
    paymentStatus: paymentStatusOf(r.paid, r.scheduled),
  }));
  return filters.stage ? mapped.filter((r) => r.stage === filters.stage) : mapped;
}

export type ProjectListItem = Awaited<ReturnType<typeof listProjects>>[number];

export function stageOf(phase: string, stepStage: string | null): PipelineStageValue {
  if (phase === "live" || phase === "maintenance") return "live";
  if (stepStage && (PIPELINE_STAGES as readonly string[]).includes(stepStage)) return stepStage as PipelineStageValue;
  return "new";
}

export function paymentStatusOf(paid: number, scheduled: number): "paid" | "partial" | "pending" | "none" {
  if (!scheduled) return "none";
  if (paid >= scheduled) return "paid";
  if (paid > 0) return "partial";
  return "pending";
}

export async function getProject(projectId: string) {
  const [row] = await db
    .select({
      project: projects,
      client: clients,
      workflowName: workflows.name,
      assigneeName: assignee.name,
    })
    .from(projects)
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .leftJoin(workflows, eq(workflows.id, projects.workflowId))
    .leftJoin(assignee, eq(assignee.id, projects.assignedToId))
    .where(eq(projects.id, projectId));
  if (!row) throw notFound("Project");
  const steps = await db
    .select({ step: projectSteps, assigneeName: users.name })
    .from(projectSteps)
    .leftJoin(users, eq(users.id, projectSteps.assignedToId))
    .where(eq(projectSteps.projectId, projectId))
    .orderBy(asc(projectSteps.position));
  const [launch] = await db.select().from(launches).where(eq(launches.projectId, projectId));
  const current = steps.find((s) => s.step.id === row.project.currentStepId)?.step ?? null;
  return {
    ...row,
    steps: steps.map((s) => ({ ...s.step, assigneeName: s.assigneeName })),
    current,
    stage: stageOf(row.project.phase, current?.pipelineStage ?? null),
    launch: launch ?? null,
  };
}

export type ProjectDetail = Awaited<ReturnType<typeof getProject>>;

export async function updateProject(
  projectId: string,
  patch: Partial<Pick<typeof projects.$inferInsert, "name" | "description" | "value" | "annualValue" | "assignedToId" | "startDate" | "dueDate" | "phase" | "onboardingAt" | "onboardingMeetingLink" | "onboardingAssigneeId">>,
  actor: Actor,
) {
  const [p] = await db.update(projects).set(patch).where(eq(projects.id, projectId)).returning();
  await logActivity({
    projectId,
    clientId: p.clientId,
    actorId: actor.id,
    event: "project.updated",
    description: patch.onboardingAt !== undefined ? "Onboarding call scheduled" : "Project details updated",
  });
  return p;
}

export async function updateStepDetails(
  projectId: string,
  stepId: string,
  patch: { notes?: string | null; assignedToId?: string | null; dueDate?: string | null },
) {
  await db
    .update(projectSteps)
    .set(patch)
    .where(and(eq(projectSteps.id, stepId), eq(projectSteps.projectId, projectId)));
}

export async function listStaff() {
  return db
    .select({ id: users.id, name: users.name, role: users.role, title: users.title })
    .from(users)
    .where(and(or(eq(users.role, "admin"), eq(users.role, "team")), eq(users.isActive, true)))
    .orderBy(asc(users.name));
}

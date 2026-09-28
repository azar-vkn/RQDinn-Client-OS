import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { projects, workflowSteps, workflows } from "@/server/db/schema";
import type { PipelineStageValue } from "@/lib/constants";
import { invalid, notFound } from "@/server/errors";

export async function listWorkflows(includeArchived = false) {
  const rows = await db
    .select({
      workflow: workflows,
      stepCount: sql<number>`(select count(*)::int from workflow_steps s where s.workflow_id = ${workflows.id})`,
      projectCount: sql<number>`(select count(*)::int from projects p where p.workflow_id = ${workflows.id})`,
    })
    .from(workflows)
    .where(includeArchived ? undefined : eq(workflows.isArchived, false))
    .orderBy(asc(workflows.name));
  return rows;
}

export async function getWorkflow(id: string) {
  const [wf] = await db.select().from(workflows).where(eq(workflows.id, id));
  if (!wf) throw notFound("Workflow");
  const steps = await db.select().from(workflowSteps).where(eq(workflowSteps.workflowId, id)).orderBy(asc(workflowSteps.position));
  return { ...wf, steps };
}

export async function workflowsWithSteps() {
  const wfs = await db.select().from(workflows).where(eq(workflows.isArchived, false)).orderBy(asc(workflows.name));
  const steps = await db.select().from(workflowSteps).orderBy(asc(workflowSteps.position));
  return wfs.map((w) => ({ ...w, steps: steps.filter((s) => s.workflowId === w.id) }));
}

export interface WorkflowInput {
  name: string;
  description?: string | null;
  serviceType: string;
  steps: { name: string; key: string; pipelineStage: PipelineStageValue; clientVisible: boolean; clientLabel?: string | null; description?: string | null }[];
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "workflow";
}

/**
 * Save a workflow definition. Changes apply to new projects only — existing
 * projects keep the step copy they were created with.
 */
export async function saveWorkflow(id: string | null, input: WorkflowInput) {
  if (!input.name.trim()) throw invalid("Name the workflow.");
  const steps = input.steps.filter((s) => s.name.trim());
  if (!steps.length) throw invalid("Add at least one step.");
  return db.transaction(async (tx) => {
    let wfId = id;
    if (wfId) {
      await tx.update(workflows).set({ name: input.name, description: input.description, serviceType: input.serviceType }).where(eq(workflows.id, wfId));
      await tx.delete(workflowSteps).where(eq(workflowSteps.workflowId, wfId));
    } else {
      let slug = slugify(input.name);
      const [exists] = await tx.select({ id: workflows.id }).from(workflows).where(eq(workflows.slug, slug));
      if (exists) slug = `${slug}-${Date.now().toString(36)}`;
      const [wf] = await tx.insert(workflows).values({ name: input.name, slug, description: input.description, serviceType: input.serviceType }).returning();
      wfId = wf.id;
    }
    await tx.insert(workflowSteps).values(
      steps.map((s, i) => ({
        workflowId: wfId!,
        position: i + 1,
        name: s.name.trim(),
        key: s.key || "custom",
        pipelineStage: s.pipelineStage,
        clientVisible: s.clientVisible,
        clientLabel: s.clientLabel || null,
        description: s.description || null,
      })),
    );
    return wfId!;
  });
}

export async function archiveWorkflow(id: string, archived: boolean) {
  await db.update(workflows).set({ isArchived: archived }).where(eq(workflows.id, id));
}

export async function workflowInUse(id: string) {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(projects).where(eq(projects.workflowId, id));
  return (r?.n ?? 0) > 0;
}

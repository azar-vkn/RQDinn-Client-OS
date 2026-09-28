import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/server/db/client";
import { clients, projects, tasks, users } from "@/server/db/schema";
import { projectScope } from "@/server/auth/permissions";
import type { Actor } from "@/server/auth/session";
import type { TaskPriorityValue, TaskStatusValue } from "@/lib/constants";
import { invalid, notFound } from "@/server/errors";
import { logActivity } from "./activity";
import { emit } from "./notifications";

export interface TaskInput {
  projectId: string;
  title: string;
  description?: string | null;
  assigneeId?: string | null;
  priority: TaskPriorityValue;
  status: TaskStatusValue;
  dueDate?: string | null;
  projectStepId?: string | null;
}

export async function listTasks(actor: Actor, filter: { projectId?: string; status?: string; assigneeId?: string; mine?: boolean } = {}) {
  const conds: (SQL | undefined)[] = [projectScope(actor)];
  if (filter.projectId) conds.push(eq(tasks.projectId, filter.projectId));
  if (filter.status) conds.push(eq(tasks.status, filter.status as never));
  if (filter.assigneeId) conds.push(eq(tasks.assigneeId, filter.assigneeId));
  if (filter.mine) conds.push(eq(tasks.assigneeId, actor.id));
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      projectStepId: tasks.projectStepId,
      assigneeId: tasks.assigneeId,
      assigneeName: users.name,
      projectId: projects.id,
      projectName: projects.name,
      clientName: clients.companyName,
      completedAt: tasks.completedAt,
      createdAt: tasks.createdAt,
    })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .leftJoin(users, eq(users.id, tasks.assigneeId))
    .where(and(...conds.filter(Boolean)))
    .orderBy(
      sql`case ${tasks.status} when 'in_progress' then 0 when 'todo' then 1 when 'waiting' then 2 else 3 end`,
      sql`case ${tasks.priority} when 'urgent' then 0 when 'high' then 1 when 'medium' then 2 else 3 end`,
      asc(tasks.dueDate),
      desc(tasks.createdAt),
    );
}

export type TaskListItem = Awaited<ReturnType<typeof listTasks>>[number];

export async function createTask(input: TaskInput, actor: Actor) {
  if (!input.title.trim()) throw invalid("Give the task a title.");
  const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId));
  if (!project) throw notFound("Project");
  const [task] = await db
    .insert(tasks)
    .values({
      ...input,
      assigneeId: input.assigneeId || null,
      dueDate: input.dueDate || null,
      projectStepId: input.projectStepId || null,
      completedAt: input.status === "completed" ? new Date() : null,
      createdById: actor.id,
    })
    .returning();
  await logActivity({ clientId: project.clientId, projectId: project.id, actorId: actor.id, event: "task.created", description: `Task added: ${task.title}` });
  if (task.assigneeId && task.assigneeId !== actor.id) {
    await emit({
      event: "task.assigned",
      actorId: actor.id,
      projectId: project.id,
      title: `New task: ${task.title}`,
      body: project.name,
      staff: { href: `/projects/${project.id}?tab=tasks` },
      userIds: [task.assigneeId],
    });
  }
  return task;
}

export async function updateTask(taskId: string, patch: Partial<Omit<TaskInput, "projectId">>, actor: Actor) {
  const [existing] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!existing) throw notFound("Task");
  const next: Partial<typeof tasks.$inferInsert> = { ...patch };
  if (patch.assigneeId !== undefined) next.assigneeId = patch.assigneeId || null;
  if (patch.dueDate !== undefined) next.dueDate = patch.dueDate || null;
  if (patch.projectStepId !== undefined) next.projectStepId = patch.projectStepId || null;
  if (patch.status) next.completedAt = patch.status === "completed" ? (existing.completedAt ?? new Date()) : null;
  const [task] = await db.update(tasks).set(next).where(eq(tasks.id, taskId)).returning();
  if (patch.status === "completed" && existing.status !== "completed") {
    const [p] = await db.select({ clientId: projects.clientId }).from(projects).where(eq(projects.id, task.projectId));
    await logActivity({ clientId: p?.clientId, projectId: task.projectId, actorId: actor.id, event: "task.completed", description: `Task completed: ${task.title}` });
  }
  return task;
}

export async function deleteTask(taskId: string) {
  await db.delete(tasks).where(eq(tasks.id, taskId));
}

export async function getTaskProjectId(taskId: string) {
  const [t] = await db.select({ projectId: tasks.projectId }).from(tasks).where(eq(tasks.id, taskId));
  if (!t) throw notFound("Task");
  return t.projectId;
}

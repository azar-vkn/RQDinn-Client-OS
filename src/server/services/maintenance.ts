import { and, desc, eq, type SQL } from "drizzle-orm";
import { db } from "@/server/db/client";
import { clients, maintenanceRequests, projects, users } from "@/server/db/schema";
import { projectScope } from "@/server/auth/permissions";
import type { Actor } from "@/server/auth/session";
import { MAINTENANCE_STATUS_LABEL } from "@/lib/constants";
import { invalid, notFound } from "@/server/errors";
import { logActivity } from "./activity";
import { emit } from "./notifications";

type MType = (typeof maintenanceRequests.$inferInsert)["type"];
type MStatus = "new" | "in_progress" | "waiting_client" | "completed";

export async function listMaintenance(actor: Actor, filter: { projectId?: string; status?: string } = {}) {
  const conds: (SQL | undefined)[] = [projectScope(actor)];
  if (filter.projectId) conds.push(eq(maintenanceRequests.projectId, filter.projectId));
  if (filter.status) conds.push(eq(maintenanceRequests.status, filter.status as never));
  return db
    .select({
      id: maintenanceRequests.id,
      type: maintenanceRequests.type,
      title: maintenanceRequests.title,
      description: maintenanceRequests.description,
      status: maintenanceRequests.status,
      priority: maintenanceRequests.priority,
      response: maintenanceRequests.response,
      createdAt: maintenanceRequests.createdAt,
      resolvedAt: maintenanceRequests.resolvedAt,
      projectId: projects.id,
      projectName: projects.name,
      clientName: clients.companyName,
      clientId: clients.id,
      requestedBy: users.name,
    })
    .from(maintenanceRequests)
    .innerJoin(projects, eq(projects.id, maintenanceRequests.projectId))
    .innerJoin(clients, eq(clients.id, maintenanceRequests.clientId))
    .leftJoin(users, eq(users.id, maintenanceRequests.requestedById))
    .where(and(...conds.filter(Boolean)))
    .orderBy(desc(maintenanceRequests.createdAt));
}

export type MaintenanceListItem = Awaited<ReturnType<typeof listMaintenance>>[number];

export async function createMaintenanceRequest(
  input: { projectId: string; type: MType; title?: string; description: string; priority?: "low" | "medium" | "high" | "urgent" },
  actor: Actor,
) {
  if (!input.description.trim()) throw invalid("Please describe what you'd like updated.");
  const [p] = await db
    .select({ id: projects.id, clientId: projects.clientId, name: projects.name, clientName: clients.companyName })
    .from(projects)
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .where(eq(projects.id, input.projectId));
  if (!p) throw notFound("Project");
  const title = input.title?.trim() || input.description.trim().split("\n")[0].slice(0, 80);
  const [req] = await db
    .insert(maintenanceRequests)
    .values({
      projectId: p.id,
      clientId: p.clientId,
      type: input.type,
      title,
      description: input.description.slice(0, 10000),
      priority: input.priority ?? "medium",
      requestedById: actor.id,
    })
    .returning();
  await logActivity({ clientId: p.clientId, projectId: p.id, actorId: actor.id, event: "maintenance.created", description: `Update requested: ${title}`, clientVisible: true });
  await emit({
    event: "maintenance.created",
    actorId: actor.id,
    clientId: p.clientId,
    projectId: p.id,
    title: `Update request from ${p.clientName}`,
    body: title,
    staff: { href: `/maintenance?open=${req.id}` },
  });
  return req;
}

export async function updateMaintenanceRequest(id: string, input: { status: MStatus; response?: string | null; assignedToId?: string | null }, actor: Actor) {
  const [existing] = await db.select().from(maintenanceRequests).where(eq(maintenanceRequests.id, id));
  if (!existing) throw notFound("Request");
  await db
    .update(maintenanceRequests)
    .set({
      status: input.status,
      response: input.response ?? existing.response,
      assignedToId: input.assignedToId === undefined ? existing.assignedToId : input.assignedToId || null,
      resolvedAt: input.status === "completed" ? (existing.resolvedAt ?? new Date()) : null,
    })
    .where(eq(maintenanceRequests.id, id));
  if (existing.status !== input.status) {
    await logActivity({
      clientId: existing.clientId,
      projectId: existing.projectId,
      actorId: actor.id,
      event: "maintenance.updated",
      description: `Update “${existing.title}” → ${MAINTENANCE_STATUS_LABEL[input.status]}`,
      clientVisible: true,
    });
    await emit({
      event: "maintenance.updated",
      actorId: actor.id,
      clientId: existing.clientId,
      projectId: existing.projectId,
      title: `Update request: ${MAINTENANCE_STATUS_LABEL[input.status]}`,
      staff: false,
      client: { href: "/portal/maintenance", title: `“${existing.title}” is ${MAINTENANCE_STATUS_LABEL[input.status].toLowerCase()}`, body: input.response?.slice(0, 140) },
    });
  }
}

export async function getMaintenanceRequest(id: string) {
  const [row] = await db.select().from(maintenanceRequests).where(eq(maintenanceRequests.id, id));
  if (!row) throw notFound("Request");
  return row;
}

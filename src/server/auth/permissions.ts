import { and, eq, exists, or, type SQL } from "drizzle-orm";
import { db } from "@/server/db/client";
import { clients, projects, tasks } from "@/server/db/schema";
import { forbidden, notFound } from "@/server/errors";
import type { Actor } from "./session";

/**
 * Authorisation rules
 * - admin: everything
 * - team:  projects they're assigned to (project owner, client owner, onboarding host, or task assignee)
 * - client: only their own company
 */

export const isStaff = (a: Actor) => a.role === "admin" || a.role === "team";

/** SQL condition limiting `projects` rows to what the actor may see. */
export function projectScope(actor: Actor): SQL | undefined {
  if (actor.role === "admin") return undefined;
  if (actor.role === "client") return eq(projects.clientId, actor.clientId ?? "00000000-0000-0000-0000-000000000000");
  return or(
    eq(projects.assignedToId, actor.id),
    eq(projects.onboardingAssigneeId, actor.id),
    exists(db.select({ x: clients.id }).from(clients).where(and(eq(clients.id, projects.clientId), eq(clients.assignedToId, actor.id)))),
    exists(db.select({ x: tasks.id }).from(tasks).where(and(eq(tasks.projectId, projects.id), eq(tasks.assigneeId, actor.id)))),
  );
}

/** SQL condition limiting `clients` rows to what the actor may see. */
export function clientScope(actor: Actor): SQL | undefined {
  if (actor.role === "admin") return undefined;
  if (actor.role === "client") return eq(clients.id, actor.clientId ?? "00000000-0000-0000-0000-000000000000");
  return or(
    eq(clients.assignedToId, actor.id),
    exists(
      db
        .select({ x: projects.id })
        .from(projects)
        .where(and(eq(projects.clientId, clients.id), projectScope(actor))),
    ),
  );
}

export async function assertProjectAccess(actor: Actor, projectId: string) {
  const scope = projectScope(actor);
  const [row] = await db
    .select({ id: projects.id, clientId: projects.clientId })
    .from(projects)
    .where(scope ? and(eq(projects.id, projectId), scope) : eq(projects.id, projectId))
    .limit(1);
  if (!row) {
    // Don't reveal whether the project exists to people who can't see it.
    throw actor.role === "admin" ? notFound("Project") : forbidden();
  }
  return row;
}

export async function assertClientAccess(actor: Actor, clientId: string) {
  const scope = clientScope(actor);
  const [row] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(scope ? and(eq(clients.id, clientId), scope) : eq(clients.id, clientId))
    .limit(1);
  if (!row) throw actor.role === "admin" ? notFound("Client") : forbidden();
  return row;
}

export function assertStaff(actor: Actor) {
  if (!isStaff(actor)) throw forbidden();
}

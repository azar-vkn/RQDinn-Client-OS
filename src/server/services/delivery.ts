/**
 * Delivery: previews → client review → revisions → approval → deployment → launch.
 */
import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { approvals, clients, deploymentItems, launches, previews, projects, revisions, users } from "@/server/db/schema";
import type { Actor } from "@/server/auth/session";
import { APPROVAL_CONFIRMATION } from "@/lib/constants";
import { normalizeUrl } from "@/lib/validators";
import { invalid, notFound } from "@/server/errors";
import { logActivity } from "./activity";
import { emit } from "./notifications";
import { handleEvent } from "./workflow-engine";

async function projectRow(projectId: string) {
  const [p] = await db
    .select({ id: projects.id, name: projects.name, clientId: projects.clientId, clientName: clients.companyName, phase: projects.phase })
    .from(projects)
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .where(eq(projects.id, projectId));
  if (!p) throw notFound("Project");
  return p;
}

/* ───────────── Previews ───────────── */

export async function listPreviews(projectId: string) {
  return db.select().from(previews).where(eq(previews.projectId, projectId)).orderBy(desc(previews.createdAt));
}

export async function addPreview(projectId: string, input: { url: string; version?: string; notes?: string | null; send: boolean }, actor: Actor) {
  const url = normalizeUrl(input.url);
  if (!url) throw invalid("Please enter a valid preview URL.");
  const p = await projectRow(projectId);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(previews).where(eq(previews.projectId, projectId));
  const version = input.version?.trim() || `V${n + 1}`;
  const [preview] = await db.insert(previews).values({ projectId, url, version, notes: input.notes, createdById: actor.id }).returning();
  await logActivity({ clientId: p.clientId, projectId, actorId: actor.id, event: "preview.uploaded", description: `Website ${version} uploaded`, clientVisible: true });
  if (input.send) await sendPreview(preview.id, actor);
  return preview;
}

export async function sendPreview(previewId: string, actor: Actor) {
  const [preview] = await db.select().from(previews).where(eq(previews.id, previewId));
  if (!preview) throw notFound("Preview");
  const p = await projectRow(preview.projectId);
  await db.transaction(async (tx) => {
    // Only one preview is "in review" at a time.
    await tx
      .update(previews)
      .set({ status: "superseded" })
      .where(and(eq(previews.projectId, preview.projectId), ne(previews.id, previewId), sql`${previews.status} in ('draft','in_review','changes_requested')`));
    await tx.update(previews).set({ status: "in_review", sentAt: new Date() }).where(eq(previews.id, previewId));
    await handleEvent(preview.projectId, "preview.sent", tx);
    await logActivity(
      { clientId: p.clientId, projectId: p.id, actorId: actor.id, event: "preview.sent", description: `Website ${preview.version} sent for client review`, clientVisible: true },
      tx,
    );
    await emit(
      {
        event: "preview.ready",
        actorId: actor.id,
        clientId: p.clientId,
        projectId: p.id,
        title: `${preview.version} sent to ${p.clientName} for review`,
        staff: { href: `/projects/${p.id}?tab=review` },
        client: { href: "/portal/review", title: "Your website preview is ready", body: `Version ${preview.version} is ready for your review.` },
      },
      tx,
    );
  });
}

/* ───────────── Revisions ───────────── */

export async function listRevisions(projectId: string) {
  return db
    .select({ revision: revisions, previewVersion: previews.version, requestedBy: users.name })
    .from(revisions)
    .leftJoin(previews, eq(previews.id, revisions.previewId))
    .leftJoin(users, eq(users.id, revisions.requestedById))
    .where(eq(revisions.projectId, projectId))
    .orderBy(desc(revisions.round));
}

export async function requestChanges(projectId: string, feedback: string, actor: Actor) {
  if (!feedback.trim()) throw invalid("Please list the changes you'd like.");
  const p = await projectRow(projectId);
  const [preview] = await db
    .select()
    .from(previews)
    .where(and(eq(previews.projectId, projectId), eq(previews.status, "in_review")))
    .orderBy(desc(previews.createdAt))
    .limit(1);
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${revisions.round}),0)::int` })
    .from(revisions)
    .where(eq(revisions.projectId, projectId));
  return db.transaction(async (tx) => {
    const [rev] = await tx
      .insert(revisions)
      .values({ projectId, previewId: preview?.id ?? null, round: max + 1, clientFeedback: feedback.slice(0, 20000), requestedById: actor.id })
      .returning();
    if (preview) await tx.update(previews).set({ status: "changes_requested" }).where(eq(previews.id, preview.id));
    await handleEvent(projectId, "revision.requested", tx);
    await logActivity(
      { clientId: p.clientId, projectId, actorId: actor.id, event: "revision.requested", description: `Revision round ${rev.round} requested`, clientVisible: true },
      tx,
    );
    await emit(
      {
        event: "revision.requested",
        actorId: actor.id,
        clientId: p.clientId,
        projectId,
        title: `${p.clientName} requested changes (round ${rev.round})`,
        body: feedback.slice(0, 140),
        staff: { href: `/projects/${projectId}?tab=review` },
      },
      tx,
    );
    return rev;
  });
}

export async function updateRevision(revisionId: string, input: { status: "pending" | "in_progress" | "completed"; response?: string | null }, actor: Actor) {
  const [rev] = await db.select().from(revisions).where(eq(revisions.id, revisionId));
  if (!rev) throw notFound("Revision");
  const p = await projectRow(rev.projectId);
  const closing = input.status === "completed" && rev.status !== "completed";
  await db
    .update(revisions)
    .set({
      status: input.status,
      response: input.response ?? rev.response,
      closedAt: input.status === "completed" ? (rev.closedAt ?? new Date()) : null,
      closedById: input.status === "completed" ? actor.id : null,
    })
    .where(eq(revisions.id, revisionId));
  if (closing) {
    await handleEvent(rev.projectId, "revision.completed");
    await logActivity({ clientId: p.clientId, projectId: p.id, actorId: actor.id, event: "revision.completed", description: `Revision round ${rev.round} completed`, clientVisible: true });
    await emit({
      event: "revision.completed",
      actorId: actor.id,
      clientId: p.clientId,
      projectId: p.id,
      title: `Revision round ${rev.round} completed`,
      staff: { href: `/projects/${p.id}?tab=review` },
      client: { href: "/portal/review", title: `Your changes (round ${rev.round}) are done`, body: input.response?.slice(0, 140) },
    });
  }
}

/* ───────────── Approval ───────────── */

export async function approveProject(projectId: string, actor: Actor, meta: { name: string; ip?: string | null; userAgent?: string | null }) {
  const p = await projectRow(projectId);
  const [preview] = await db
    .select()
    .from(previews)
    .where(and(eq(previews.projectId, projectId), sql`${previews.status} in ('in_review','changes_requested')`))
    .orderBy(desc(previews.createdAt))
    .limit(1);
  if (!preview) throw invalid("There's no preview awaiting approval.");
  const open = await db
    .select({ id: revisions.id })
    .from(revisions)
    .where(and(eq(revisions.projectId, projectId), ne(revisions.status, "completed")));
  if (open.length && actor.role === "client") throw invalid("There are open revision requests. We'll let you know once they're done.");
  return db.transaction(async (tx) => {
    const [approval] = await tx
      .insert(approvals)
      .values({
        projectId,
        previewId: preview.id,
        version: preview.version,
        approvedById: actor.id,
        approvedName: meta.name,
        confirmation: APPROVAL_CONFIRMATION,
        ipAddress: meta.ip,
        userAgent: meta.userAgent?.slice(0, 300),
      })
      .returning();
    await tx.update(previews).set({ status: "approved" }).where(eq(previews.id, preview.id));
    await handleEvent(projectId, "project.approved", tx);
    await logActivity(
      { clientId: p.clientId, projectId, actorId: actor.id, event: "project.approved", description: `Website ${preview.version} approved for launch by ${meta.name}`, clientVisible: true },
      tx,
    );
    await emit(
      {
        event: "project.approved",
        actorId: actor.id,
        clientId: p.clientId,
        projectId,
        title: `${p.clientName} approved ${preview.version} 🎉`,
        body: "Next: final payment",
        staff: { href: `/projects/${projectId}?tab=payments` },
      },
      tx,
    );
    return approval;
  });
}

export async function listApprovals(projectId: string) {
  return db.select().from(approvals).where(eq(approvals.projectId, projectId)).orderBy(desc(approvals.approvedAt));
}

/* ───────────── Deployment & launch ───────────── */

export async function getDeployment(projectId: string) {
  const items = await db
    .select({ item: deploymentItems, doneBy: users.name })
    .from(deploymentItems)
    .leftJoin(users, eq(users.id, deploymentItems.doneById))
    .where(eq(deploymentItems.projectId, projectId))
    .orderBy(asc(deploymentItems.position));
  const required = items.filter((i) => i.item.required);
  const readyToLaunch = required.length > 0 && required.every((i) => i.item.isDone);
  return { items, readyToLaunch, done: items.filter((i) => i.item.isDone).length, total: items.length };
}

const INFRA_KEYS = ["domain", "dns", "ssl"];

export async function toggleDeploymentItem(projectId: string, itemId: string, isDone: boolean, actor: Actor) {
  const [item] = await db
    .update(deploymentItems)
    .set({ isDone, doneAt: isDone ? new Date() : null, doneById: isDone ? actor.id : null })
    .where(and(eq(deploymentItems.id, itemId), eq(deploymentItems.projectId, projectId)))
    .returning();
  if (!item) throw notFound("Checklist item");
  const { items, readyToLaunch } = await getDeployment(projectId);
  const infra = items.filter((i) => INFRA_KEYS.includes(i.item.key));
  if (isDone && infra.length && infra.every((i) => i.item.isDone)) await handleEvent(projectId, "deployment.infrastructure_ready");
  if (isDone && readyToLaunch) {
    const p = await projectRow(projectId);
    await logActivity({ clientId: p.clientId, projectId, actorId: actor.id, event: "deployment.ready", description: "Deployment checklist complete — ready to launch" });
  }
  return { readyToLaunch };
}

export async function addDeploymentItem(projectId: string, label: string, required: boolean) {
  if (!label.trim()) throw invalid("Enter a checklist item.");
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${deploymentItems.position}),0)::int` })
    .from(deploymentItems)
    .where(eq(deploymentItems.projectId, projectId));
  await db.insert(deploymentItems).values({ projectId, position: max + 1, key: `custom_${Date.now()}`, label: label.trim(), required });
}

export async function launchProject(
  projectId: string,
  input: { url: string; hostingRenewalDate?: string | null; maintenanceRenewalDate?: string | null; analyticsUrl?: string | null; notes?: string | null },
  actor: Actor,
) {
  const url = normalizeUrl(input.url);
  if (!url) throw invalid("Enter the live website URL.");
  const analyticsUrl = input.analyticsUrl ? normalizeUrl(input.analyticsUrl) : null;
  if (input.analyticsUrl && !analyticsUrl) throw invalid("Enter a valid analytics URL.");
  const { readyToLaunch } = await getDeployment(projectId);
  if (!readyToLaunch) throw invalid("Complete all required deployment checklist items first.");
  const p = await projectRow(projectId);
  const [existing] = await db.select().from(launches).where(eq(launches.projectId, projectId));
  if (existing) throw invalid("This project is already live.");
  return db.transaction(async (tx) => {
    const [launch] = await tx
      .insert(launches)
      .values({
        projectId,
        url,
        hostingRenewalDate: input.hostingRenewalDate || null,
        maintenanceRenewalDate: input.maintenanceRenewalDate || null,
        analyticsUrl,
        notes: input.notes,
        launchedById: actor.id,
      })
      .returning();
    await tx.update(projects).set({ phase: "live", liveUrl: url }).where(eq(projects.id, projectId));
    await tx.update(clients).set({ status: "completed" }).where(eq(clients.id, p.clientId));
    await handleEvent(projectId, "project.launched", tx);
    await logActivity({ clientId: p.clientId, projectId, actorId: actor.id, event: "project.launched", description: `🎉 Website is LIVE at ${url}`, clientVisible: true }, tx);
    await emit(
      {
        event: "project.launched",
        actorId: actor.id,
        clientId: p.clientId,
        projectId,
        title: `🎉 ${p.name} is live`,
        body: url,
        staff: { href: `/projects/${projectId}` },
        client: { href: "/portal", title: "🎉 Your website is LIVE!", body: url },
      },
      tx,
    );
    return launch;
  });
}

export async function startMaintenance(projectId: string, actor: Actor) {
  const p = await projectRow(projectId);
  if (p.phase !== "live") throw invalid("Only live projects can move to maintenance.");
  await db.transaction(async (tx) => {
    await tx.update(projects).set({ phase: "maintenance" }).where(eq(projects.id, projectId));
    await tx.update(clients).set({ status: "maintenance" }).where(eq(clients.id, p.clientId));
    await handleEvent(projectId, "maintenance.started", tx);
    await logActivity({ clientId: p.clientId, projectId, actorId: actor.id, event: "maintenance.started", description: "Project moved to maintenance", clientVisible: true }, tx);
  });
}

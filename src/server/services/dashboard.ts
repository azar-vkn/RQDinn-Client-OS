import { and, asc, desc, eq, gte, ilike, inArray, isNotNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  activityLogs,
  clients,
  documents,
  invoices,
  maintenanceRequests,
  payments,
  projects,
  tasks,
  users,
} from "@/server/db/schema";
import { clientScope, projectScope } from "@/server/auth/permissions";
import type { Actor } from "@/server/auth/session";
import { PIPELINE_STAGES } from "@/lib/constants";
import { listProjects } from "./projects";

export async function getDashboard(actor: Actor) {
  const cScope = clientScope(actor);
  const scope = projectScope(actor);

  // Independent queries run in parallel — each round trip to a hosted database costs ~100 ms.
  const [projectList, [{ activeClients }], myTasks, activity, upcomingCalls, [{ openMaintenance }]] = await Promise.all([
    listProjects(actor),
    db
      .select({ activeClients: sql<number>`count(*)::int` })
      .from(clients)
      .where(and(inArray(clients.status, ["active", "maintenance"]), cScope)),
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        projectId: projects.id,
        projectName: projects.name,
        clientName: clients.companyName,
      })
      .from(tasks)
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .innerJoin(clients, eq(clients.id, projects.clientId))
      .where(and(eq(tasks.assigneeId, actor.id), ne(tasks.status, "completed")))
      .orderBy(sql`${tasks.dueDate} asc nulls last`)
      .limit(6),
    db
      .select({
        id: activityLogs.id,
        description: activityLogs.description,
        event: activityLogs.event,
        createdAt: activityLogs.createdAt,
        actorName: users.name,
        clientName: clients.companyName,
        projectId: activityLogs.projectId,
      })
      .from(activityLogs)
      .leftJoin(users, eq(users.id, activityLogs.actorId))
      .leftJoin(clients, eq(clients.id, activityLogs.clientId))
      .leftJoin(projects, eq(projects.id, activityLogs.projectId))
      .where(scope ? and(isNotNull(activityLogs.projectId), scope) : undefined)
      .orderBy(desc(activityLogs.createdAt))
      .limit(8),
    db
      .select({ id: projects.id, name: projects.name, clientName: clients.companyName, at: projects.onboardingAt, link: projects.onboardingMeetingLink })
      .from(projects)
      .innerJoin(clients, eq(clients.id, projects.clientId))
      .where(and(gte(projects.onboardingAt, new Date(Date.now() - 2 * 3600_000)), scope))
      .orderBy(asc(projects.onboardingAt))
      .limit(4),
    db
      .select({ openMaintenance: sql<number>`count(*)::int` })
      .from(maintenanceRequests)
      .innerJoin(projects, eq(projects.id, maintenanceRequests.projectId))
      .where(and(ne(maintenanceRequests.status, "completed"), scope)),
  ]);

  const active = projectList.filter((p) => p.phase === "active");
  const pendingPayments = projectList.reduce((s, p) => s + Math.max(0, p.scheduled - p.paid), 0);
  const launchingSoon = active.filter((p) => ["final_payment", "domain_hosting", "deployment", "final_approval"].includes(p.stepKey ?? "") || p.stage === "ready_to_launch");
  const pipeline = PIPELINE_STAGES.map((stage) => ({ stage, projects: projectList.filter((p) => p.stage === stage && p.phase !== "cancelled") }));

  return {
    stats: { activeClients, activeProjects: active.length, pendingPayments, launchingSoon: launchingSoon.length, openMaintenance },
    pipeline,
    myTasks,
    activity,
    upcomingCalls,
  };
}

export async function getAnalytics(actor: Actor) {
  const scope = projectScope(actor);
  const since = new Date();
  since.setMonth(since.getMonth() - 5, 1);
  since.setHours(0, 0, 0, 0);
  const monthly = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${payments.receivedAt}), 'YYYY-MM')`,
      total: sql<number>`coalesce(sum(${payments.amount}),0)::int`,
    })
    .from(payments)
    .innerJoin(projects, eq(projects.id, payments.projectId))
    .where(and(gte(payments.receivedAt, since), scope))
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  const months: { month: string; total: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(since);
    d.setMonth(since.getMonth() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ month: key, total: monthly.find((m) => m.month === key)?.total ?? 0 });
  }

  const projectList = await listProjects(actor);
  const byService = Object.entries(
    projectList.reduce<Record<string, number>>((acc, p) => {
      acc[p.serviceType] = (acc[p.serviceType] ?? 0) + p.value + p.annualValue;
      return acc;
    }, {}),
  ).map(([service, value]) => ({ service, value }));
  const byStage = PIPELINE_STAGES.map((s) => ({ stage: s, count: projectList.filter((p) => p.stage === s).length }));
  const contracted = projectList.reduce((s, p) => s + p.scheduled, 0);
  const collected = projectList.reduce((s, p) => s + p.paid, 0);
  const annualRecurring = projectList.filter((p) => p.phase === "live" || p.phase === "maintenance").reduce((s, p) => s + p.annualValue, 0);

  const [{ openTasks }] = await db
    .select({ openTasks: sql<number>`count(*)::int` })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .where(and(ne(tasks.status, "completed"), scope));

  return { months, byService, byStage, contracted, collected, annualRecurring, openTasks, projectCount: projectList.length };
}

export interface SearchResult {
  type: "client" | "project" | "invoice" | "document" | "task" | "maintenance";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export async function globalSearch(actor: Actor, q: string): Promise<SearchResult[]> {
  const term = `%${q.trim().replace(/[%_]/g, "")}%`;
  if (q.trim().length < 2) return [];
  const pScope = projectScope(actor);
  const cScope = clientScope(actor);

  const [cl, pr, inv, docs, tk, mt] = await Promise.all([
    db.select({ id: clients.id, name: clients.companyName, city: clients.city, status: clients.status }).from(clients).where(and(ilike(clients.companyName, term), cScope)).limit(5),
    db
      .select({ id: projects.id, name: projects.name, client: clients.companyName })
      .from(projects)
      .innerJoin(clients, eq(clients.id, projects.clientId))
      .where(and(or(ilike(projects.name, term), ilike(clients.companyName, term)), pScope))
      .limit(5),
    db
      .select({ id: invoices.id, number: invoices.number, client: clients.companyName, status: invoices.status })
      .from(invoices)
      .innerJoin(clients, eq(clients.id, invoices.clientId))
      .leftJoin(projects, eq(projects.id, invoices.projectId))
      .where(and(or(ilike(invoices.number, term), ilike(clients.companyName, term)), cScope))
      .limit(5),
    db
      .select({ id: documents.id, name: documents.name, client: clients.companyName, fileId: documents.fileId })
      .from(documents)
      .innerJoin(clients, eq(clients.id, documents.clientId))
      .where(and(ilike(documents.name, term), cScope))
      .limit(5),
    db
      .select({ id: tasks.id, title: tasks.title, projectId: projects.id, project: projects.name })
      .from(tasks)
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .where(and(ilike(tasks.title, term), pScope))
      .limit(5),
    db
      .select({ id: maintenanceRequests.id, title: maintenanceRequests.title, project: projects.name })
      .from(maintenanceRequests)
      .innerJoin(projects, eq(projects.id, maintenanceRequests.projectId))
      .where(and(ilike(maintenanceRequests.title, term), pScope))
      .limit(5),
  ]);

  return [
    ...cl.map((c) => ({ type: "client" as const, id: c.id, title: c.name, subtitle: c.city ?? "Client", href: `/clients/${c.id}` })),
    ...pr.map((p) => ({ type: "project" as const, id: p.id, title: p.name, subtitle: p.client, href: `/projects/${p.id}` })),
    ...inv.map((i) => ({ type: "invoice" as const, id: i.id, title: i.number, subtitle: i.client, href: `/invoices/${i.id}` })),
    ...docs.map((d) => ({ type: "document" as const, id: d.id, title: d.name, subtitle: d.client, href: d.fileId ? `/api/files/${d.fileId}?inline=1` : "/documents" })),
    ...tk.map((t) => ({ type: "task" as const, id: t.id, title: t.title, subtitle: t.project, href: `/projects/${t.projectId}?tab=tasks` })),
    ...mt.map((m) => ({ type: "maintenance" as const, id: m.id, title: m.title, subtitle: m.project, href: `/maintenance?open=${m.id}` })),
  ];
}

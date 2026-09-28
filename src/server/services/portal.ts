import { cookies } from "next/headers";
import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/server/db/client";
import { agreements, invoices, onboardingForms, previews, projects, users } from "@/server/db/schema";
import type { Actor } from "@/server/auth/session";
import { forbidden } from "@/server/errors";
import { getClient } from "./clients";
import { getProject, listProjects } from "./projects";
import { getAgency } from "./settings";

export const PORTAL_PROJECT_COOKIE = "rq_portal_project";

/** Everything the client portal needs about "their" current project. */
export async function getPortalContext(actor: Actor) {
  if (actor.role !== "client" || !actor.clientId) throw forbidden();
  const [{ client, contacts }, projectList, agency] = await Promise.all([getClient(actor.clientId), listProjects(actor), getAgency()]);
  const visible = projectList.filter((p) => p.phase !== "cancelled");
  const chosenId = (await cookies()).get(PORTAL_PROJECT_COOKIE)?.value;
  const chosen = visible.find((p) => p.id === chosenId) ?? visible.find((p) => p.phase === "active") ?? visible[0] ?? null;
  const project = chosen ? await getProject(chosen.id) : null;

  let pm: { name: string; email: string; phone: string | null; title: string | null } | null = null;
  if (project?.project.assignedToId) {
    const [u] = await db.select({ name: users.name, email: users.email, phone: users.phone, title: users.title }).from(users).where(eq(users.id, project.project.assignedToId));
    pm = u ?? null;
  }

  // Things waiting on the client.
  const attention: { kind: string; title: string; description: string; href: string }[] = [];
  if (project) {
    const pid = project.project.id;
    const [ag] = await db.select().from(agreements).where(and(eq(agreements.projectId, pid), eq(agreements.status, "sent"))).orderBy(desc(agreements.createdAt)).limit(1);
    if (ag) attention.push({ kind: "agreement", title: "Review & accept your agreement", description: "Please read and accept the project agreement.", href: `/portal/agreements/${ag.id}` });
    const [pv] = await db.select().from(previews).where(and(eq(previews.projectId, pid), eq(previews.status, "in_review"))).limit(1);
    if (pv) attention.push({ kind: "preview", title: "Your website preview is ready", description: `Version ${pv.version} is waiting for your review.`, href: "/portal/review" });
    const dueInvoices = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.projectId, pid), ne(invoices.status, "draft"), ne(invoices.status, "void"), ne(invoices.status, "paid")));
    for (const inv of dueInvoices) attention.push({ kind: "invoice", title: `Invoice ${inv.number} is due`, description: "View the invoice and payment details.", href: `/portal/invoices/${inv.id}` });
    const [ob] = await db.select().from(onboardingForms).where(eq(onboardingForms.projectId, pid));
    if (ob && ob.status !== "completed" && project.current?.key === "onboarding")
      attention.push({ kind: "onboarding", title: "Share your business details", description: "Fill in your requirements before the onboarding call.", href: "/portal/onboarding" });
  }

  return {
    client,
    primaryContact: contacts[0] ?? null,
    projects: visible.map((p) => ({ id: p.id, name: p.name })),
    project,
    pm,
    agency,
    attention,
  };
}

export type PortalContext = Awaited<ReturnType<typeof getPortalContext>>;

export async function assertPortalProject(actor: Actor, projectId: string) {
  const [p] = await db.select({ clientId: projects.clientId }).from(projects).where(eq(projects.id, projectId));
  if (!p || p.clientId !== actor.clientId) throw forbidden();
}

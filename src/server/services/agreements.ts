import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { agreementTemplates, agreements, clients, paymentMilestones, projects } from "@/server/db/schema";
import type { Actor } from "@/server/auth/session";
import { renderTemplate } from "@/lib/agreement-template";
import { formatDate, formatMoney } from "@/lib/format";
import { findField } from "@/lib/onboarding";
import { invalid, notFound } from "@/server/errors";
import { logActivity } from "./activity";
import { emit } from "./notifications";
import { getAgency } from "./settings";
import { handleEvent } from "./workflow-engine";

export async function listTemplates() {
  return db.select().from(agreementTemplates).orderBy(desc(agreementTemplates.isDefault), asc(agreementTemplates.name));
}

export async function saveTemplate(input: { id?: string; name: string; body: string; isDefault?: boolean }) {
  if (!input.name.trim() || !input.body.trim()) throw invalid("Template name and body are required.");
  if (input.isDefault) await db.update(agreementTemplates).set({ isDefault: false });
  if (input.id) {
    await db.update(agreementTemplates).set({ name: input.name, body: input.body, isDefault: input.isDefault ?? false }).where(eq(agreementTemplates.id, input.id));
    return input.id;
  }
  const [row] = await db.insert(agreementTemplates).values({ name: input.name, body: input.body, isDefault: input.isDefault ?? false }).returning();
  return row.id;
}

/** Default variable values derived from the project. Staff can override before generating. */
export async function agreementDefaults(projectId: string) {
  const [row] = await db
    .select({ project: projects, clientName: clients.companyName })
    .from(projects)
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .where(eq(projects.id, projectId));
  if (!row) throw notFound("Project");
  const milestones = await db.select().from(paymentMilestones).where(eq(paymentMilestones.projectId, projectId)).orderBy(asc(paymentMilestones.position));
  const agency = await getAgency();
  const terms = milestones.length
    ? milestones
        .map((m) => {
          const when = m.kind === "advance" ? "before work begins" : m.kind === "final" ? "after final approval, before launch" : m.kind === "annual" ? "at launch, then yearly" : "as agreed";
          return `• ${m.label}: ${formatMoney(m.amount)} — ${when}`;
        })
        .join("\n")
    : "As agreed between both parties.";
  const features = findField("requirements.features")?.options ?? [];
  return {
    CLIENT_NAME: row.clientName,
    PROJECT_NAME: row.project.name,
    PROJECT_PRICE: formatMoney(row.project.value),
    ANNUAL_PRICE: formatMoney(row.project.annualValue),
    PAYMENT_TERMS: terms,
    START_DATE: formatDate(row.project.startDate ?? new Date()),
    DELIVERY_SCOPE:
      row.project.description ||
      `• Responsive website (mobile, tablet, desktop)\n• Up to 6 pages / sections: ${features.slice(0, 6).join(", ")}\n• WhatsApp & Google Maps integration\n• Basic on-page SEO\n• Domain, hosting and SSL setup`,
    AGENCY_NAME: agency.legalName || agency.name,
    TODAY: formatDate(new Date()),
  } as Record<string, string>;
}

export async function generateAgreement(projectId: string, templateId: string, overrides: Record<string, string>, actor: Actor) {
  const [tpl] = await db.select().from(agreementTemplates).where(eq(agreementTemplates.id, templateId));
  if (!tpl) throw invalid("Choose an agreement template.");
  const defaults = await agreementDefaults(projectId);
  const vars = { ...defaults, ...Object.fromEntries(Object.entries(overrides).filter(([, v]) => v?.trim())) };
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  return db.transaction(async (tx) => {
    const [ag] = await tx
      .insert(agreements)
      .values({
        clientId: project.clientId,
        projectId,
        templateId,
        title: `${project.name} — Agreement`,
        body: renderTemplate(tpl.body, vars),
        variables: vars,
        createdById: actor.id,
      })
      .returning();
    await logActivity({ clientId: project.clientId, projectId, actorId: actor.id, event: "agreement.generated", description: "Agreement generated", clientVisible: false }, tx);
    await handleEvent(projectId, "agreement.generated", tx);
    await emit({ event: "agreement.created", actorId: actor.id, clientId: project.clientId, projectId, title: `Agreement generated — ${project.name}`, staff: { href: `/agreements/${ag.id}` } }, tx);
    return ag;
  });
}

export async function getAgreement(agreementId: string) {
  const [row] = await db
    .select({ agreement: agreements, clientName: clients.companyName, projectName: projects.name })
    .from(agreements)
    .innerJoin(clients, eq(clients.id, agreements.clientId))
    .innerJoin(projects, eq(projects.id, agreements.projectId))
    .where(eq(agreements.id, agreementId));
  if (!row) throw notFound("Agreement");
  return row;
}

export async function listAgreements(filter: { projectId?: string; clientId?: string }) {
  return db
    .select()
    .from(agreements)
    .where(filter.projectId ? eq(agreements.projectId, filter.projectId) : filter.clientId ? eq(agreements.clientId, filter.clientId) : undefined)
    .orderBy(desc(agreements.createdAt));
}

export async function updateAgreementBody(agreementId: string, body: string) {
  const { agreement } = await getAgreement(agreementId);
  if (agreement.status !== "draft") throw invalid("Only draft agreements can be edited.");
  await db.update(agreements).set({ body }).where(eq(agreements.id, agreementId));
}

export async function sendAgreement(agreementId: string, actor: Actor) {
  const { agreement, projectName } = await getAgreement(agreementId);
  if (agreement.status === "accepted") throw invalid("This agreement is already accepted.");
  await db.update(agreements).set({ status: "sent", sentAt: new Date() }).where(eq(agreements.id, agreementId));
  await handleEvent(agreement.projectId, "agreement.sent");
  await logActivity({ clientId: agreement.clientId, projectId: agreement.projectId, actorId: actor.id, event: "agreement.sent", description: "Agreement sent to client", clientVisible: true });
  await emit({
    event: "agreement.sent",
    actorId: actor.id,
    clientId: agreement.clientId,
    projectId: agreement.projectId,
    title: `Agreement sent — ${projectName}`,
    staff: false,
    client: { href: `/portal/agreements/${agreementId}`, title: "Your agreement is ready to review" },
  });
}

/**
 * Acceptance. Clients acknowledge in the portal (click-through, recorded with name,
 * time and IP). Staff can record an agreement that was signed offline.
 * Neither is presented as a legally binding e-signature — see integrations/esign.ts.
 */
export async function acceptAgreement(agreementId: string, actor: Actor, opts: { name: string; ip?: string | null; offline?: boolean }) {
  const { agreement, projectName } = await getAgreement(agreementId);
  if (agreement.status === "accepted") return;
  if (actor.role === "client" && agreement.status !== "sent") throw invalid("This agreement isn't ready for acceptance yet.");
  if (!opts.name.trim()) throw invalid("Please type your full name to accept.");
  await db
    .update(agreements)
    .set({
      status: "accepted",
      acceptedAt: new Date(),
      acceptedById: actor.id,
      acceptedName: opts.offline ? `${opts.name} (signed offline, recorded by staff)` : opts.name,
      acceptedIp: opts.ip ?? null,
    })
    .where(eq(agreements.id, agreementId));
  await handleEvent(agreement.projectId, "agreement.accepted");
  await logActivity({
    clientId: agreement.clientId,
    projectId: agreement.projectId,
    actorId: actor.id,
    event: "agreement.accepted",
    description: opts.offline ? "Signed agreement recorded" : `Agreement accepted by ${opts.name}`,
    clientVisible: true,
  });
  await emit({
    event: "agreement.accepted",
    actorId: actor.id,
    clientId: agreement.clientId,
    projectId: agreement.projectId,
    title: `Agreement accepted — ${projectName}`,
    staff: { href: `/projects/${agreement.projectId}?tab=documents` },
  });
}

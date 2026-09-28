import { and, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { clients, files, onboardingAnswers, onboardingForms, projectSteps, projects, tasks } from "@/server/db/schema";
import type { Actor } from "@/server/auth/session";
import { projectScope } from "@/server/auth/permissions";
import {
  computeOnboarding,
  findField,
  visibleSections,
  type AnswerState,
  type OnboardingContext,
} from "@/lib/onboarding";
import { isEmail, isHexColor, isPhone, normalizeUrl } from "@/lib/validators";
import { invalid, notFound } from "@/server/errors";
import { logActivity } from "./activity";
import { emit } from "./notifications";
import { handleEvent } from "./workflow-engine";

async function formFor(projectId: string) {
  const [row] = await db
    .select({ form: onboardingForms, industry: clients.industry, serviceType: projects.serviceType, clientId: clients.id, clientName: clients.companyName, projectName: projects.name })
    .from(projects)
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .leftJoin(onboardingForms, eq(onboardingForms.projectId, projects.id))
    .where(eq(projects.id, projectId));
  if (!row) throw notFound("Project");
  let form = row.form;
  if (!form) [form] = await db.insert(onboardingForms).values({ projectId }).returning();
  return { ...row, form };
}

export async function getOnboarding(projectId: string) {
  const base = await formFor(projectId);
  const ctx: OnboardingContext = { industry: base.industry, serviceType: base.serviceType };
  const rows = await db.select().from(onboardingAnswers).where(eq(onboardingAnswers.formId, base.form.id));
  const answers: Record<string, AnswerState> = {};
  for (const r of rows) answers[r.fieldKey] = { value: r.value, status: r.status };
  const fileRows = await db
    .select({ id: files.id, name: files.name, mimeType: files.mimeType, size: files.size, fieldKey: files.onboardingFieldKey, createdAt: files.createdAt })
    .from(files)
    .where(and(eq(files.projectId, projectId), sql`${files.onboardingFieldKey} is not null`));
  const filesByField: Record<string, typeof fileRows> = {};
  const fileCounts: Record<string, number> = {};
  for (const f of fileRows) {
    const k = f.fieldKey!;
    (filesByField[k] ??= []).push(f);
    fileCounts[k] = (fileCounts[k] ?? 0) + 1;
  }
  return {
    form: base.form,
    clientId: base.clientId,
    clientName: base.clientName,
    projectName: base.projectName,
    ctx,
    sections: visibleSections(ctx),
    answers,
    filesByField,
    computed: computeOnboarding(ctx, answers, fileCounts),
  };
}

export type OnboardingData = Awaited<ReturnType<typeof getOnboarding>>;

function validateValue(fieldKey: string, value: unknown): unknown {
  const field = findField(fieldKey);
  if (!field) throw invalid("Unknown field.");
  if (value === null || value === undefined || value === "") return null;
  switch (field.type) {
    case "url": {
      const url = normalizeUrl(String(value));
      if (url === null) throw invalid(`${field.label}: please enter a valid link.`);
      return url || null;
    }
    case "email":
      if (!isEmail(String(value))) throw invalid(`${field.label}: please enter a valid email address.`);
      return String(value).trim();
    case "phone":
      if (!isPhone(String(value))) throw invalid(`${field.label}: please enter a valid phone number.`);
      return String(value).trim();
    case "color":
      if (!isHexColor(String(value))) throw invalid(`${field.label}: use a hex colour like #D97757.`);
      return String(value).trim();
    case "number": {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0) throw invalid(`${field.label}: please enter a number.`);
      return n;
    }
    case "select":
      return String(value).slice(0, 200);
    case "multiselect":
    case "checklist": {
      if (!Array.isArray(value)) throw invalid(`${field.label}: invalid selection.`);
      return [...new Set(value.map((v) => String(v).trim().slice(0, 120)).filter(Boolean))].slice(0, 60);
    }
    case "file":
      return null;
    default:
      return String(value).slice(0, 8000);
  }
}

async function refreshProgress(projectId: string) {
  const data = await getOnboarding(projectId);
  await db.update(onboardingForms).set({ progress: data.computed.progress }).where(eq(onboardingForms.id, data.form.id));
  return data;
}

async function markStarted(projectId: string, formId: string, status: string, actor: Actor) {
  if (status !== "not_started") return;
  await db.update(onboardingForms).set({ status: "in_progress", startedAt: new Date() }).where(eq(onboardingForms.id, formId));
  await handleEvent(projectId, "onboarding.started");
  const [p] = await db.select({ clientId: projects.clientId }).from(projects).where(eq(projects.id, projectId));
  await logActivity({ projectId, clientId: p?.clientId, actorId: actor.id, event: "onboarding.started", description: "Onboarding started", clientVisible: true });
}

export async function saveAnswer(
  projectId: string,
  fieldKey: string,
  rawValue: unknown,
  status: "answered" | "client_later" | "not_applicable",
  actor: Actor,
) {
  const { form } = await formFor(projectId);
  if (form.status === "completed" && actor.role === "client") throw invalid("Onboarding is already completed.");
  const field = findField(fieldKey);
  if (!field) throw invalid("Unknown field.");
  const value = status === "answered" ? validateValue(fieldKey, rawValue) : null;
  const section = fieldKey.split(".")[0];
  await db
    .insert(onboardingAnswers)
    .values({ formId: form.id, section, fieldKey, value: value as never, status, updatedById: actor.id })
    .onConflictDoUpdate({
      target: [onboardingAnswers.formId, onboardingAnswers.fieldKey],
      set: { value: value as never, status, updatedById: actor.id, updatedAt: new Date() },
    });
  await markStarted(projectId, form.id, form.status, actor);
  const data = await refreshProgress(projectId);
  return { value, progress: data.computed.progress };
}

export async function saveCallNotes(projectId: string, notes: string, actor: Actor) {
  const { form } = await formFor(projectId);
  await db.update(onboardingForms).set({ callNotes: notes.slice(0, 20000) }).where(eq(onboardingForms.id, form.id));
  await markStarted(projectId, form.id, form.status, actor);
}

export async function setCurrentSection(projectId: string, section: string) {
  const { form } = await formFor(projectId);
  await db.update(onboardingForms).set({ currentSection: section.slice(0, 40) }).where(eq(onboardingForms.id, form.id));
}

/** Complete onboarding: sync key answers into the client record, create follow-up tasks, advance the workflow. */
export async function completeOnboarding(projectId: string, actor: Actor) {
  const data = await getOnboarding(projectId);
  if (data.form.status === "completed") throw invalid("Onboarding is already completed.");
  const missing = data.computed.sections.flatMap((s) => s.missingRequired.map((m) => `${s.title}: ${m}`));
  if (missing.length) throw invalid(`A few required answers are missing — ${missing.slice(0, 4).join(", ")}${missing.length > 4 ? "…" : ""}`);

  const a = (k: string) => {
    const v = data.answers[k]?.value;
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  const outstanding = data.computed.assets.filter((x) => x.state !== "received");

  await db.transaction(async (tx) => {
    await tx
      .update(onboardingForms)
      .set({ status: "completed", completedAt: new Date(), completedById: actor.id, progress: data.computed.progress })
      .where(eq(onboardingForms.id, data.form.id));

    // Onboarding answers become part of the client record (only fill blanks — never overwrite curated data).
    const [client] = await tx.select().from(clients).where(eq(clients.id, data.clientId));
    await tx
      .update(clients)
      .set({
        address: client.address || a("business.address"),
        city: client.city || a("business.city"),
        googleBusinessUrl: client.googleBusinessUrl || a("business.gbp_url") || a("social.gbp"),
        instagram: client.instagram || a("social.instagram"),
      })
      .where(eq(clients.id, data.clientId));

    // Follow-up tasks for assets the client will send later.
    if (outstanding.length) {
      const [contentStep] = await tx
        .select({ id: projectSteps.id })
        .from(projectSteps)
        .where(and(eq(projectSteps.projectId, projectId), eq(projectSteps.key, "content_collection")));
      await tx.insert(tasks).values(
        outstanding.map((o, i) => ({
          projectId,
          title: `Collect ${o.label.toLowerCase()} from client`,
          description: "Marked during onboarding as pending from the client.",
          priority: "high" as const,
          status: "waiting" as const,
          position: i,
          projectStepId: contentStep?.id ?? null,
          createdById: actor.id,
        })),
      );
    }

    await logActivity(
      {
        projectId,
        clientId: data.clientId,
        actorId: actor.id,
        event: "onboarding.completed",
        description: outstanding.length
          ? `Onboarding completed — ${outstanding.length} item(s) pending from client`
          : "Onboarding completed",
        clientVisible: true,
      },
      tx,
    );
    await handleEvent(projectId, outstanding.length ? "onboarding.completed_with_outstanding" : "onboarding.completed", tx);
    await emit(
      {
        event: "onboarding.completed",
        actorId: actor.id,
        clientId: data.clientId,
        projectId,
        title: `Onboarding completed — ${data.clientName}`,
        body: outstanding.length ? `Pending: ${outstanding.map((o) => o.label).join(", ")}` : "All content received.",
        staff: { href: `/projects/${projectId}` },
        client: {
          href: "/portal",
          title: "Onboarding completed",
          body: outstanding.length ? `We're waiting on: ${outstanding.map((o) => o.label).join(", ")}` : "Thanks! We have everything we need to start.",
        },
      },
      tx,
    );
  });
  return { outstanding: outstanding.map((o) => o.label) };
}

export async function reopenOnboarding(projectId: string, actor: Actor) {
  const { form, clientId } = await formFor(projectId);
  await db.update(onboardingForms).set({ status: "in_progress", completedAt: null }).where(eq(onboardingForms.id, form.id));
  await logActivity({ projectId, clientId, actorId: actor.id, event: "onboarding.reopened", description: "Onboarding reopened for edits" });
}

/** All onboarding forms (for the Onboarding hub). */
export async function listOnboardingForms(actor: Actor) {
  const scope = projectScope(actor);
  return db
    .select({
      projectId: projects.id,
      projectName: projects.name,
      clientName: clients.companyName,
      clientId: clients.id,
      status: onboardingForms.status,
      progress: onboardingForms.progress,
      onboardingAt: projects.onboardingAt,
      meetingLink: projects.onboardingMeetingLink,
      updatedAt: onboardingForms.updatedAt,
      completedAt: onboardingForms.completedAt,
      phase: projects.phase,
    })
    .from(onboardingForms)
    .innerJoin(projects, eq(projects.id, onboardingForms.projectId))
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .where(scope);
}

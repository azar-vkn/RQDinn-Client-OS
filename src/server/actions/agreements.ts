"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { requireActor, requireAdmin, requireStaff } from "@/server/auth/session";
import { assertProjectAccess } from "@/server/auth/permissions";
import { acceptAgreement, generateAgreement, getAgreement, saveTemplate, sendAgreement, updateAgreementBody } from "@/server/services/agreements";
import { forbidden } from "@/server/errors";
import { formObject, run } from "./run";
import { checkbox, requiredText, uuid } from "./schemas";

export async function generateAgreementAction(projectId: string, fd: FormData) {
  return run(async () => {
    const actor = await requireStaff();
    await assertProjectAccess(actor, projectId);
    const raw = formObject(fd);
    const templateId = uuid.parse(raw.templateId);
    const overrides: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) if (/^[A-Z_]+$/.test(k) && typeof v === "string") overrides[k] = v.slice(0, 5000);
    const ag = await generateAgreement(projectId, templateId, overrides, actor);
    return { id: ag.id };
  }, "Agreement generated.");
}

async function authorize(agreementId: string, roles: ("admin" | "team" | "client")[]) {
  const actor = await requireActor(roles);
  const { agreement } = await getAgreement(uuid.parse(agreementId));
  await assertProjectAccess(actor, agreement.projectId);
  return { actor, agreement };
}

export async function updateAgreementBodyAction(agreementId: string, body: string) {
  return run(async () => {
    await authorize(agreementId, ["admin", "team"]);
    await updateAgreementBody(agreementId, z.string().min(20, "The agreement looks empty.").max(100_000).parse(body));
  }, "Agreement saved.");
}

export async function sendAgreementAction(agreementId: string) {
  return run(async () => {
    const { actor } = await authorize(agreementId, ["admin", "team"]);
    await sendAgreement(agreementId, actor);
  }, "Agreement shared with the client in their portal.");
}

export async function recordSignedAgreementAction(agreementId: string, fd: FormData) {
  return run(async () => {
    const { actor } = await authorize(agreementId, ["admin", "team"]);
    const { name } = z.object({ name: requiredText("Signer name") }).parse(formObject(fd));
    await acceptAgreement(agreementId, actor, { name, offline: true });
  }, "Signed agreement recorded.");
}

export async function acceptAgreementAction(agreementId: string, fd: FormData) {
  return run(async () => {
    const { actor, agreement } = await authorize(agreementId, ["client"]);
    if (agreement.clientId !== actor.clientId) throw forbidden();
    const input = z
      .object({ name: requiredText("Your full name"), confirm: checkbox.refine((v) => v, "Please confirm you have read the agreement.") })
      .parse(formObject(fd));
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
    await acceptAgreement(agreementId, actor, { name: input.name, ip });
  }, "Thank you — the agreement has been accepted.");
}

export async function saveTemplateAction(fd: FormData) {
  return run(async () => {
    await requireAdmin();
    const input = z
      .object({ id: z.string().optional(), name: requiredText("Template name"), body: z.string().min(20, "Template body is too short.").max(100_000), isDefault: checkbox })
      .parse(formObject(fd));
    return saveTemplate({ ...input, id: input.id || undefined });
  }, "Template saved.");
}

"use server";

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireActor, requireStaff } from "@/server/auth/session";
import { assertProjectAccess } from "@/server/auth/permissions";
import { db } from "@/server/db/client";
import { previews, revisions } from "@/server/db/schema";
import {
  addDeploymentItem,
  addPreview,
  approveProject,
  launchProject,
  requestChanges,
  sendPreview,
  startMaintenance,
  toggleDeploymentItem,
  updateRevision,
} from "@/server/services/delivery";
import { handleEvent } from "@/server/services/workflow-engine";
import { logActivity } from "@/server/services/activity";
import { APPROVAL_CONFIRMATION } from "@/lib/constants";
import { forbidden, notFound } from "@/server/errors";
import { formObject, run } from "./run";
import { checkbox, optionalDate, optionalText, optionalUrl, requiredText, uuid } from "./schemas";

export async function addPreviewAction(projectId: string, fd: FormData) {
  return run(async () => {
    const actor = await requireStaff();
    await assertProjectAccess(actor, projectId);
    const input = z
      .object({ url: requiredText("Preview URL", 500), version: optionalText(20), notes: optionalText(2000), send: checkbox })
      .parse(formObject(fd));
    await addPreview(projectId, { ...input, version: input.version ?? undefined }, actor);
  }, "Preview saved.");
}

export async function sendPreviewAction(previewId: string) {
  return run(async () => {
    const actor = await requireStaff();
    const [p] = await db.select().from(previews).where(eq(previews.id, uuid.parse(previewId)));
    if (!p) throw notFound("Preview");
    await assertProjectAccess(actor, p.projectId);
    await sendPreview(p.id, actor);
  }, "Preview sent — the client has been notified.");
}

export async function requestChangesAction(projectId: string, fd: FormData) {
  return run(async () => {
    const actor = await requireActor();
    await assertProjectAccess(actor, projectId);
    const { feedback } = z.object({ feedback: requiredText("Your feedback", 20000) }).parse(formObject(fd));
    const rev = await requestChanges(projectId, feedback, actor);
    return { revisionId: rev.id, round: rev.round };
  }, "Thanks — your changes were sent to the RQdinn team.");
}

export async function updateRevisionAction(revisionId: string, fd: FormData) {
  return run(async () => {
    const actor = await requireStaff();
    const [r] = await db.select().from(revisions).where(eq(revisions.id, uuid.parse(revisionId)));
    if (!r) throw notFound("Revision");
    await assertProjectAccess(actor, r.projectId);
    const input = z.object({ status: z.enum(["pending", "in_progress", "completed"]), response: optionalText(10000) }).parse(formObject(fd));
    await updateRevision(r.id, input, actor);
  }, "Revision updated.");
}

export async function approveProjectAction(projectId: string, fd: FormData) {
  return run(async () => {
    const actor = await requireActor();
    const p = await assertProjectAccess(actor, projectId);
    if (actor.role === "client" && p.clientId !== actor.clientId) throw forbidden();
    const input = z
      .object({ confirm: checkbox.refine((v) => v, "Please tick the confirmation to approve."), name: optionalText(200) })
      .parse(formObject(fd));
    const h = await headers();
    await approveProject(projectId, actor, {
      name: actor.role === "client" ? actor.name : `${input.name ?? "Client"} (approval recorded by ${actor.name})`,
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: h.get("user-agent"),
    });
    return { confirmation: APPROVAL_CONFIRMATION };
  }, "Approved! 🎉");
}

export async function toggleDeploymentItemAction(projectId: string, itemId: string, done: boolean) {
  return run(async () => {
    const actor = await requireStaff();
    await assertProjectAccess(actor, projectId);
    return toggleDeploymentItem(projectId, uuid.parse(itemId), done, actor);
  });
}

export async function addDeploymentItemAction(projectId: string, fd: FormData) {
  return run(async () => {
    const actor = await requireStaff();
    await assertProjectAccess(actor, projectId);
    const { label, required } = z.object({ label: requiredText("Item"), required: checkbox }).parse(formObject(fd));
    await addDeploymentItem(projectId, label, required);
  }, "Checklist item added.");
}

export async function launchProjectAction(projectId: string, fd: FormData) {
  return run(async () => {
    const actor = await requireStaff();
    await assertProjectAccess(actor, projectId);
    const input = z
      .object({
        url: requiredText("Live URL", 500),
        hostingRenewalDate: optionalDate,
        maintenanceRenewalDate: optionalDate,
        analyticsUrl: optionalUrl("Analytics URL"),
        notes: optionalText(3000),
      })
      .parse(formObject(fd));
    await launchProject(projectId, input, actor);
  }, "🎉 Project is LIVE!");
}

export async function startMaintenanceAction(projectId: string) {
  return run(async () => {
    const actor = await requireStaff();
    await assertProjectAccess(actor, projectId);
    await startMaintenance(projectId, actor);
  }, "Project moved to maintenance.");
}

export async function markContentCompleteAction(projectId: string) {
  return run(async () => {
    const actor = await requireStaff();
    const p = await assertProjectAccess(actor, projectId);
    await handleEvent(projectId, "content.completed");
    await logActivity({ projectId, clientId: p.clientId, actorId: actor.id, event: "content.completed", description: "Content collection completed — development started", clientVisible: true });
  }, "Content collection complete. Development has started.");
}

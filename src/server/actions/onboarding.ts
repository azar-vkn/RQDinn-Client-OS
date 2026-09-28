"use server";

import { z } from "zod";
import { requireActor, requireStaff } from "@/server/auth/session";
import { assertProjectAccess } from "@/server/auth/permissions";
import { completeOnboarding, reopenOnboarding, saveAnswer, saveCallNotes, setCurrentSection } from "@/server/services/onboarding";
import { run } from "./run";

/** Autosave a single onboarding answer. Used by staff (admin/call mode) and clients (portal). */
export async function saveAnswerAction(projectId: string, fieldKey: string, value: unknown, status: "answered" | "client_later" | "not_applicable" = "answered") {
  return run(async () => {
    const actor = await requireActor();
    await assertProjectAccess(actor, projectId);
    z.string().max(80).parse(fieldKey);
    z.enum(["answered", "client_later", "not_applicable"]).parse(status);
    return saveAnswer(projectId, fieldKey, value, status, actor);
  });
}

export async function saveCallNotesAction(projectId: string, notes: string) {
  return run(async () => {
    const actor = await requireStaff();
    await assertProjectAccess(actor, projectId);
    await saveCallNotes(projectId, z.string().max(20000).parse(notes), actor);
  });
}

export async function setSectionAction(projectId: string, section: string) {
  return run(async () => {
    const actor = await requireActor();
    await assertProjectAccess(actor, projectId);
    await setCurrentSection(projectId, section);
  });
}

export async function completeOnboardingAction(projectId: string) {
  return run(async () => {
    const actor = await requireStaff();
    await assertProjectAccess(actor, projectId);
    return completeOnboarding(projectId, actor);
  }, "Onboarding completed successfully.");
}

export async function reopenOnboardingAction(projectId: string) {
  return run(async () => {
    const actor = await requireStaff();
    await assertProjectAccess(actor, projectId);
    await reopenOnboarding(projectId, actor);
  }, "Onboarding reopened.");
}

"use server";

import { z } from "zod";
import { requireStaff } from "@/server/auth/session";
import { assertClientAccess, assertProjectAccess } from "@/server/auth/permissions";
import { createProject, updateProject, updateStepDetails } from "@/server/services/projects";
import { setStepStatus } from "@/server/services/workflow-engine";
import { STEP_STATUSES } from "@/lib/constants";
import { formObject, run } from "./run";
import { money, optionalDate, optionalText, optionalUrl, optionalUuid, requiredText, uuid } from "./schemas";

const projectSchema = z.object({
  clientId: uuid,
  workflowId: z.string().uuid("Please choose a workflow."),
  name: requiredText("Project name", 200),
  serviceType: z.string().min(1).max(40),
  description: optionalText(5000),
  value: money("Project value"),
  annualValue: money("Annual value"),
  advancePercent: z.coerce.number().min(0).max(100).default(50),
  assignedToId: optionalUuid,
  startDate: optionalDate,
  dueDate: optionalDate,
});

export async function createProjectAction(fd: FormData) {
  return run(async () => {
    const actor = await requireStaff();
    const input = projectSchema.parse(formObject(fd));
    await assertClientAccess(actor, input.clientId);
    const p = await createProject(input, actor);
    return { id: p.id };
  }, "Project created.");
}

const editSchema = z.object({
  name: requiredText("Project name", 200),
  description: optionalText(5000),
  value: money("Project value"),
  annualValue: money("Annual value"),
  assignedToId: optionalUuid,
  startDate: optionalDate,
  dueDate: optionalDate,
  phase: z.enum(["active", "live", "maintenance", "on_hold", "cancelled"]),
});

export async function updateProjectAction(projectId: string, fd: FormData) {
  return run(async () => {
    const actor = await requireStaff();
    await assertProjectAccess(actor, projectId);
    await updateProject(projectId, editSchema.parse(formObject(fd)), actor);
  }, "Project updated.");
}

const scheduleSchema = z.object({
  onboardingAt: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : null))
    .refine((d) => d === null || !Number.isNaN(d.getTime()), "Enter a valid date and time."),
  onboardingMeetingLink: optionalUrl("Meeting link"),
  onboardingAssigneeId: optionalUuid,
});

export async function scheduleOnboardingAction(projectId: string, fd: FormData) {
  return run(async () => {
    const actor = await requireStaff();
    await assertProjectAccess(actor, projectId);
    await updateProject(projectId, scheduleSchema.parse(formObject(fd)), actor);
  }, "Onboarding call scheduled.");
}

export async function setStepStatusAction(projectId: string, stepId: string, status: string) {
  return run(async () => {
    const actor = await requireStaff();
    await assertProjectAccess(actor, projectId);
    await setStepStatus(projectId, uuid.parse(stepId), z.enum(STEP_STATUSES).parse(status), actor.id);
  });
}

const stepSchema = z.object({ notes: optionalText(5000), assignedToId: optionalUuid, dueDate: optionalDate });

export async function updateStepAction(projectId: string, stepId: string, fd: FormData) {
  return run(async () => {
    const actor = await requireStaff();
    await assertProjectAccess(actor, projectId);
    await updateStepDetails(projectId, uuid.parse(stepId), stepSchema.parse(formObject(fd)));
  }, "Stage updated.");
}

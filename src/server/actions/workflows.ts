"use server";

import { z } from "zod";
import { requireAdmin } from "@/server/auth/session";
import { archiveWorkflow, saveWorkflow } from "@/server/services/workflows";
import { PIPELINE_STAGES } from "@/lib/constants";
import { run } from "./run";
import { uuid } from "./schemas";

const schema = z.object({
  name: z.string().trim().min(1, "Name the workflow.").max(120),
  description: z.string().max(1000).nullable().optional(),
  serviceType: z.string().min(1).max(40),
  steps: z
    .array(
      z.object({
        name: z.string().trim().max(120),
        key: z.string().trim().max(60).regex(/^[a-z0-9_]*$/, "Step keys use lowercase letters, numbers and underscores."),
        pipelineStage: z.enum(PIPELINE_STAGES),
        clientVisible: z.boolean(),
        clientLabel: z.string().max(120).nullable().optional(),
      }),
    )
    .max(40),
});

export async function saveWorkflowAction(id: string | null, input: unknown) {
  return run(async () => {
    await requireAdmin();
    const data = schema.parse(input);
    return { id: await saveWorkflow(id ? uuid.parse(id) : null, data) };
  }, "Workflow saved. New projects will use this version.");
}

export async function archiveWorkflowAction(id: string, archived: boolean) {
  return run(async () => {
    await requireAdmin();
    await archiveWorkflow(uuid.parse(id), archived);
  }, archived ? "Workflow archived." : "Workflow restored.");
}

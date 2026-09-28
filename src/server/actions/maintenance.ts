"use server";

import { z } from "zod";
import { requireActor, requireStaff } from "@/server/auth/session";
import { assertProjectAccess } from "@/server/auth/permissions";
import { createMaintenanceRequest, getMaintenanceRequest, updateMaintenanceRequest } from "@/server/services/maintenance";
import { MAINTENANCE_TYPES, TASK_PRIORITIES } from "@/lib/constants";
import { formObject, run } from "./run";
import { optionalText, optionalUuid, requiredText, uuid } from "./schemas";

const createSchema = z.object({
  projectId: uuid,
  type: z.enum(MAINTENANCE_TYPES.map((t) => t.value) as [string, ...string[]]),
  title: optionalText(120),
  description: requiredText("Description", 10000),
  priority: z.enum(TASK_PRIORITIES).optional(),
});

export async function createMaintenanceAction(fd: FormData) {
  return run(async () => {
    const actor = await requireActor();
    const input = createSchema.parse(formObject(fd));
    await assertProjectAccess(actor, input.projectId);
    const req = await createMaintenanceRequest(
      { ...input, type: input.type as never, title: input.title ?? undefined, priority: actor.role === "client" ? "medium" : input.priority },
      actor,
    );
    return { id: req.id };
  }, "Request submitted. We'll get back to you soon.");
}

export async function updateMaintenanceAction(id: string, fd: FormData) {
  return run(async () => {
    const actor = await requireStaff();
    const req = await getMaintenanceRequest(uuid.parse(id));
    await assertProjectAccess(actor, req.projectId);
    const input = z
      .object({ status: z.enum(["new", "in_progress", "waiting_client", "completed"]), response: optionalText(10000), assignedToId: optionalUuid })
      .parse(formObject(fd));
    await updateMaintenanceRequest(id, input, actor);
  }, "Request updated.");
}

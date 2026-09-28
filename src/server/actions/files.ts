"use server";

import { z } from "zod";
import { requireActor } from "@/server/auth/session";
import { assertClientAccess, assertProjectAccess, isStaff } from "@/server/auth/permissions";
import { deleteFile, getFile, moveFile } from "@/server/services/files";
import { createDocument, deleteDocument } from "@/server/services/documents";
import { forbidden } from "@/server/errors";
import { logActivity } from "@/server/services/activity";
import { formObject, run } from "./run";
import { checkbox, optionalUuid, requiredText, uuid } from "./schemas";

async function authorizeFile(fileId: string) {
  const actor = await requireActor();
  const file = await getFile(uuid.parse(fileId));
  if (file.projectId) await assertProjectAccess(actor, file.projectId);
  else await assertClientAccess(actor, file.clientId);
  // Clients may only remove files they uploaded themselves.
  if (!isStaff(actor) && file.uploadedById !== actor.id) throw forbidden("You can only remove files you uploaded.");
  return { actor, file };
}

export async function deleteFileAction(fileId: string) {
  return run(async () => {
    const { actor, file } = await authorizeFile(fileId);
    await deleteFile(file.id);
    await logActivity({ clientId: file.clientId, projectId: file.projectId, actorId: actor.id, event: "file.deleted", description: `${file.name} removed` });
  }, "File removed.");
}

export async function moveFileAction(fileId: string, folder: string) {
  return run(async () => {
    const { file } = await authorizeFile(fileId);
    await moveFile(file.id, z.string().min(1).max(60).parse(folder));
  }, "File moved.");
}

const docSchema = z.object({
  clientId: uuid,
  projectId: optionalUuid,
  type: z.enum(["proposal", "brief", "receipt", "other"]),
  name: requiredText("Document name", 200),
  fileId: uuid,
  clientVisible: checkbox,
});

export async function createDocumentAction(fd: FormData) {
  return run(async () => {
    const actor = await requireActor(["admin", "team"]);
    const input = docSchema.parse(formObject(fd));
    await assertClientAccess(actor, input.clientId);
    await createDocument(input, actor);
  }, "Document added.");
}

export async function deleteDocumentAction(id: string, clientId: string) {
  return run(async () => {
    const actor = await requireActor(["admin", "team"]);
    await assertClientAccess(actor, uuid.parse(clientId));
    await deleteDocument(uuid.parse(id));
  }, "Document removed.");
}

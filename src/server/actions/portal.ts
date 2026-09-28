"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { requireActor } from "@/server/auth/session";
import { assertPortalProject, PORTAL_PROJECT_COOKIE } from "@/server/services/portal";
import { logActivity } from "@/server/services/activity";
import { emit } from "@/server/services/notifications";
import { formObject, run } from "./run";
import { requiredText, uuid } from "./schemas";

export async function selectPortalProjectAction(projectId: string) {
  return run(async () => {
    const actor = await requireActor(["client"]);
    await assertPortalProject(actor, uuid.parse(projectId));
    (await cookies()).set(PORTAL_PROJECT_COOKIE, projectId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/portal", maxAge: 60 * 60 * 24 * 180 });
  });
}

export async function contactRqdinnAction(fd: FormData) {
  return run(async () => {
    const actor = await requireActor(["client"]);
    const { projectId, message } = z.object({ projectId: uuid, message: requiredText("Message", 5000) }).parse(formObject(fd));
    await assertPortalProject(actor, projectId);
    await logActivity({ clientId: actor.clientId, projectId, actorId: actor.id, event: "client.message", description: `Message from ${actor.name}: ${message.slice(0, 200)}`, clientVisible: false });
    await emit({
      event: "client.message",
      actorId: actor.id,
      clientId: actor.clientId,
      projectId,
      title: `Message from ${actor.name}`,
      body: message.slice(0, 200),
      staff: { href: `/projects/${projectId}?tab=activity` },
    });
  }, "Message sent. The RQdinn team will get back to you shortly.");
}

"use server";

import { requireActor } from "@/server/auth/session";
import { listNotifications, markAllRead, markRead, unreadCount } from "@/server/services/notifications";
import { run } from "./run";

export async function getNotificationsAction() {
  const actor = await requireActor();
  const [items, unread] = await Promise.all([listNotifications(actor.id), unreadCount(actor.id)]);
  return {
    unread,
    items: items.map((n) => ({ id: n.id, title: n.title, body: n.body, href: n.href, readAt: n.readAt?.toISOString() ?? null, createdAt: n.createdAt.toISOString(), event: n.event })),
  };
}

export async function markAllReadAction() {
  return run(async () => {
    const actor = await requireActor();
    await markAllRead(actor.id);
  });
}

export async function markReadAction(id: string) {
  return run(async () => {
    const actor = await requireActor();
    await markRead(actor.id, id);
  });
}

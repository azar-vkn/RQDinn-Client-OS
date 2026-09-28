import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db, type DbOrTx } from "@/server/db/client";
import { clients, notifications, projects, users } from "@/server/db/schema";
import { CHANNELS, type Recipient } from "@/server/integrations/notifications/channels";

/** Every event that can notify someone. Channels per event can be tuned here. */
export const NOTIFICATION_EVENTS = {
  "client.created": { channels: ["in_app", "whatsapp"] },
  "agreement.created": { channels: ["in_app"] },
  "agreement.sent": { channels: ["in_app", "email"] },
  "agreement.accepted": { channels: ["in_app"] },
  "invoice.created": { channels: ["in_app"] },
  "invoice.sent": { channels: ["in_app", "email", "whatsapp"] },
  "payment.received": { channels: ["in_app", "whatsapp"] },
  "payment.pending": { channels: ["in_app", "whatsapp"] },
  "onboarding.completed": { channels: ["in_app"] },
  "file.uploaded": { channels: ["in_app"] },
  "preview.ready": { channels: ["in_app", "whatsapp", "email"] },
  "revision.requested": { channels: ["in_app"] },
  "revision.completed": { channels: ["in_app"] },
  "project.approved": { channels: ["in_app"] },
  "project.launched": { channels: ["in_app", "whatsapp", "email"] },
  "maintenance.created": { channels: ["in_app"] },
  "maintenance.updated": { channels: ["in_app"] },
  "task.assigned": { channels: ["in_app"] },
  "client.message": { channels: ["in_app", "email"] },
} as const;

export type NotificationEvent = keyof typeof NOTIFICATION_EVENTS;

export interface EmitInput {
  event: NotificationEvent;
  actorId?: string | null;
  clientId?: string | null;
  projectId?: string | null;
  title: string;
  body?: string;
  /** Who should hear about it. */
  staff?: { href?: string } | false;
  client?: { href?: string; title?: string; body?: string } | false;
  /** Extra specific users (e.g. a task assignee). */
  userIds?: string[];
}

async function staffRecipients(tx: DbOrTx, projectId?: string | null, clientId?: string | null): Promise<Recipient[]> {
  const assigned: string[] = [];
  if (projectId) {
    const [p] = await tx
      .select({ a: projects.assignedToId, o: projects.onboardingAssigneeId, c: clients.assignedToId })
      .from(projects)
      .innerJoin(clients, eq(clients.id, projects.clientId))
      .where(eq(projects.id, projectId));
    if (p) for (const v of [p.a, p.o, p.c]) if (v) assigned.push(v);
  } else if (clientId) {
    const [c] = await tx.select({ c: clients.assignedToId }).from(clients).where(eq(clients.id, clientId));
    if (c?.c) assigned.push(c.c);
  }
  return tx
    .select({ userId: users.id, name: users.name, email: users.email, phone: users.phone })
    .from(users)
    .where(
      and(
        eq(users.isActive, true),
        assigned.length ? or(eq(users.role, "admin"), inArray(users.id, assigned)) : eq(users.role, "admin"),
      ),
    );
}

async function clientRecipients(tx: DbOrTx, clientId: string): Promise<Recipient[]> {
  return tx
    .select({ userId: users.id, name: users.name, email: users.email, phone: users.phone })
    .from(users)
    .where(and(eq(users.clientId, clientId), eq(users.role, "client"), eq(users.isActive, true)));
}

/**
 * Emit a business event. Resolves recipients and delivers through every enabled
 * channel configured for that event. Channel failures never break the business action.
 */
export async function emit(input: EmitInput, tx: DbOrTx = db) {
  const allowed = NOTIFICATION_EVENTS[input.event].channels as readonly string[];
  const channels = CHANNELS.filter((c) => c.isEnabled() && allowed.includes(c.name));
  const deliveries: { r: Recipient; title: string; body?: string; href?: string }[] = [];
  const seen = new Set<string>();
  const push = (r: Recipient, title: string, body?: string, href?: string) => {
    if (r.userId === input.actorId || seen.has(r.userId)) return;
    seen.add(r.userId);
    deliveries.push({ r, title, body, href });
  };

  if (input.staff !== false) {
    for (const r of await staffRecipients(tx, input.projectId, input.clientId)) push(r, input.title, input.body, input.staff?.href);
  }
  if (input.client && input.clientId) {
    for (const r of await clientRecipients(tx, input.clientId))
      push(r, input.client.title ?? input.title, input.client.body ?? input.body, input.client.href);
  }
  if (input.userIds?.length) {
    const extra = await tx
      .select({ userId: users.id, name: users.name, email: users.email, phone: users.phone })
      .from(users)
      .where(inArray(users.id, input.userIds));
    for (const r of extra) push(r, input.title, input.body, input.staff ? input.staff.href : undefined);
  }

  for (const d of deliveries) {
    for (const channel of channels) {
      try {
        await channel.send(d.r, { event: input.event, title: d.title, body: d.body, href: d.href }, tx);
      } catch (err) {
        console.error(`[notifications] ${channel.name} failed for ${input.event}`, err);
      }
    }
  }
}

export async function listNotifications(userId: string, limit = 30) {
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit);
}

export async function unreadCount(userId: string) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row?.n ?? 0;
}

export async function markAllRead(userId: string) {
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

export async function markRead(userId: string, id: string) {
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, userId), eq(notifications.id, id)));
}

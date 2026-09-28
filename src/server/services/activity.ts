import { and, desc, eq, type SQL } from "drizzle-orm";
import { db, type DbOrTx } from "@/server/db/client";
import { activityLogs, users } from "@/server/db/schema";

export interface ActivityInput {
  clientId?: string | null;
  projectId?: string | null;
  actorId?: string | null;
  event: string;
  description: string;
  clientVisible?: boolean;
  metadata?: Record<string, unknown>;
}

export async function logActivity(input: ActivityInput, tx: DbOrTx = db) {
  await tx.insert(activityLogs).values({
    clientId: input.clientId ?? null,
    projectId: input.projectId ?? null,
    actorId: input.actorId ?? null,
    event: input.event,
    description: input.description,
    clientVisible: input.clientVisible ?? false,
    metadata: input.metadata,
  });
}

export async function listActivity(opts: { clientId?: string; projectId?: string; clientVisibleOnly?: boolean; limit?: number }) {
  const conds: SQL[] = [];
  if (opts.clientId) conds.push(eq(activityLogs.clientId, opts.clientId));
  if (opts.projectId) conds.push(eq(activityLogs.projectId, opts.projectId));
  if (opts.clientVisibleOnly) conds.push(eq(activityLogs.clientVisible, true));
  return db
    .select({
      id: activityLogs.id,
      event: activityLogs.event,
      description: activityLogs.description,
      createdAt: activityLogs.createdAt,
      actorName: users.name,
      projectId: activityLogs.projectId,
    })
    .from(activityLogs)
    .leftJoin(users, eq(users.id, activityLogs.actorId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(activityLogs.createdAt))
    .limit(opts.limit ?? 100);
}

import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/server/db/client";
import { clientContacts, clients, projects, users } from "@/server/db/schema";
import { clientScope } from "@/server/auth/permissions";
import type { Actor } from "@/server/auth/session";
import { hashPassword, generateTempPassword } from "@/server/auth/password";
import { invalid, notFound } from "@/server/errors";
import { logActivity } from "./activity";
import { emit } from "./notifications";

export interface ClientInput {
  companyName: string;
  industry: string;
  status: "lead" | "active" | "on_hold" | "completed" | "maintenance";
  address?: string | null;
  city?: string | null;
  website?: string | null;
  googleBusinessUrl?: string | null;
  instagram?: string | null;
  notes?: string | null;
  assignedToId?: string | null;
  contact: { name: string; role?: string | null; phone?: string | null; email?: string | null; whatsapp?: string | null };
}

export async function listClients(actor: Actor, filters: { q?: string; status?: string } = {}) {
  const conds: (SQL | undefined)[] = [clientScope(actor)];
  if (filters.q)
    conds.push(
      or(
        ilike(clients.companyName, `%${filters.q}%`),
        ilike(clients.city, `%${filters.q}%`),
        sql`exists (select 1 from client_contacts cc where cc.client_id = ${clients.id} and (cc.name ilike ${"%" + filters.q + "%"} or cc.phone ilike ${"%" + filters.q + "%"} or cc.email ilike ${"%" + filters.q + "%"}))`,
      ),
    );
  if (filters.status) conds.push(eq(clients.status, filters.status as never));

  return db
    .select({
      id: clients.id,
      companyName: clients.companyName,
      industry: clients.industry,
      status: clients.status,
      city: clients.city,
      createdAt: clients.createdAt,
      isDemo: clients.isDemo,
      assigneeName: users.name,
      contactName: sql<string | null>`(select cc.name from client_contacts cc where cc.client_id = ${clients.id} order by cc.is_primary desc, cc.created_at limit 1)`,
      contactPhone: sql<string | null>`(select cc.phone from client_contacts cc where cc.client_id = ${clients.id} order by cc.is_primary desc, cc.created_at limit 1)`,
      contactEmail: sql<string | null>`(select cc.email from client_contacts cc where cc.client_id = ${clients.id} order by cc.is_primary desc, cc.created_at limit 1)`,
      projectCount: sql<number>`(select count(*)::int from projects p where p.client_id = ${clients.id})`,
      totalValue: sql<number>`(select coalesce(sum(p.value + p.annual_value),0)::int from projects p where p.client_id = ${clients.id})`,
    })
    .from(clients)
    .leftJoin(users, eq(users.id, clients.assignedToId))
    .where(and(...conds.filter(Boolean)))
    .orderBy(desc(clients.updatedAt));
}

export type ClientListItem = Awaited<ReturnType<typeof listClients>>[number];

export async function getClient(clientId: string) {
  const [row] = await db
    .select({ client: clients, assigneeName: users.name })
    .from(clients)
    .leftJoin(users, eq(users.id, clients.assignedToId))
    .where(eq(clients.id, clientId));
  if (!row) throw notFound("Client");
  const contacts = await db
    .select()
    .from(clientContacts)
    .where(eq(clientContacts.clientId, clientId))
    .orderBy(desc(clientContacts.isPrimary), asc(clientContacts.createdAt));
  const portalUsers = await db
    .select({ id: users.id, name: users.name, email: users.email, lastLoginAt: users.lastLoginAt, isActive: users.isActive })
    .from(users)
    .where(and(eq(users.clientId, clientId), eq(users.role, "client")));
  return { ...row, contacts, portalUsers };
}

export async function createClient(input: ClientInput, actor: Actor) {
  return db.transaction(async (tx) => {
    const [client] = await tx
      .insert(clients)
      .values({
        companyName: input.companyName,
        industry: input.industry,
        status: input.status,
        address: input.address,
        city: input.city,
        website: input.website,
        googleBusinessUrl: input.googleBusinessUrl,
        instagram: input.instagram,
        notes: input.notes,
        assignedToId: input.assignedToId || null,
      })
      .returning();
    await tx.insert(clientContacts).values({ ...input.contact, clientId: client.id, isPrimary: true });
    await logActivity(
      { clientId: client.id, actorId: actor.id, event: "client.created", description: `Client ${client.companyName} created`, clientVisible: true },
      tx,
    );
    await emit(
      {
        event: "client.created",
        actorId: actor.id,
        clientId: client.id,
        title: `New client: ${client.companyName}`,
        staff: { href: `/clients/${client.id}` },
      },
      tx,
    );
    return client;
  });
}

export async function updateClient(clientId: string, input: ClientInput, actor: Actor) {
  return db.transaction(async (tx) => {
    const [client] = await tx
      .update(clients)
      .set({
        companyName: input.companyName,
        industry: input.industry,
        status: input.status,
        address: input.address,
        city: input.city,
        website: input.website,
        googleBusinessUrl: input.googleBusinessUrl,
        instagram: input.instagram,
        notes: input.notes,
        assignedToId: input.assignedToId || null,
      })
      .where(eq(clients.id, clientId))
      .returning();
    if (!client) throw notFound("Client");
    const [primary] = await tx
      .select()
      .from(clientContacts)
      .where(and(eq(clientContacts.clientId, clientId), eq(clientContacts.isPrimary, true)));
    if (primary) await tx.update(clientContacts).set(input.contact).where(eq(clientContacts.id, primary.id));
    else await tx.insert(clientContacts).values({ ...input.contact, clientId, isPrimary: true });
    await logActivity({ clientId, actorId: actor.id, event: "client.updated", description: "Client details updated" }, tx);
    return client;
  });
}

export async function addContact(clientId: string, contact: ClientInput["contact"]) {
  await db.insert(clientContacts).values({ ...contact, clientId });
}

export async function deleteContact(clientId: string, contactId: string) {
  await db.delete(clientContacts).where(and(eq(clientContacts.id, contactId), eq(clientContacts.clientId, clientId), eq(clientContacts.isPrimary, false)));
}

/**
 * Create portal access for a client. Returns a one-time temporary password
 * for staff to share (no email provider is wired yet).
 */
export async function createPortalUser(clientId: string, input: { name: string; email: string }, actor: Actor) {
  const email = input.email.trim().toLowerCase();
  const [existing] = await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${email}`);
  if (existing) throw invalid("A user with this email already exists.");
  const password = generateTempPassword();
  await db.insert(users).values({ name: input.name, email, role: "client", clientId, passwordHash: await hashPassword(password) });
  await logActivity({ clientId, actorId: actor.id, event: "portal.access", description: `Portal access created for ${input.name}` });
  return { email, password };
}

export async function resetPortalPassword(clientId: string, userId: string) {
  const password = generateTempPassword();
  const res = await db
    .update(users)
    .set({ passwordHash: await hashPassword(password) })
    .where(and(eq(users.id, userId), eq(users.clientId, clientId), eq(users.role, "client")))
    .returning({ email: users.email });
  if (!res.length) throw notFound("Portal user");
  return { email: res[0].email, password };
}

export async function clientProjectsCount(clientId: string) {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(projects).where(eq(projects.clientId, clientId));
  return r?.n ?? 0;
}

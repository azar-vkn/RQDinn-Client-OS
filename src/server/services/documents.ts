import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { db } from "@/server/db/client";
import { agreements, clients, documents, invoices, payments, projects } from "@/server/db/schema";
import { projectScope } from "@/server/auth/permissions";
import type { Actor } from "@/server/auth/session";
import { formatMoney } from "@/lib/format";
import { invalid } from "@/server/errors";
import { logActivity } from "./activity";

export interface DocumentRow {
  id: string;
  kind: "agreement" | "invoice" | "receipt" | "proposal" | "brief" | "other";
  name: string;
  status: string;
  date: Date | string;
  clientId: string;
  clientName: string;
  projectId: string | null;
  projectName: string | null;
  href: string;
  downloadHref: string | null;
  amount?: number;
}

/**
 * Unified document list. Agreements, invoices and receipts live in their own
 * tables (no duplication); other documents live in `documents`. This merges them.
 */
export async function listDocuments(actor: Actor, filter: { clientId?: string; projectId?: string } = {}): Promise<DocumentRow[]> {
  const isClient = actor.role === "client";
  const scope = projectScope(actor);
  const projectIn = (col: SQL | typeof projects.id) =>
    scope ? sql`${col} in (select ${projects.id} from ${projects} where ${scope})` : undefined;
  const base = (clientCol: AnyPgColumn, projectCol: AnyPgColumn) => {
    const c: (SQL | undefined)[] = [];
    if (filter.clientId) c.push(eq(clientCol, filter.clientId));
    if (filter.projectId) c.push(eq(projectCol, filter.projectId));
    if (isClient) c.push(eq(clientCol, actor.clientId!));
    else if (scope) c.push(projectIn(projectCol as never));
    return c;
  };

  const ag = await db
    .select({ a: agreements, clientName: clients.companyName, projectName: projects.name })
    .from(agreements)
    .innerJoin(clients, eq(clients.id, agreements.clientId))
    .innerJoin(projects, eq(projects.id, agreements.projectId))
    .where(and(...base(agreements.clientId, agreements.projectId), isClient ? sql`${agreements.status} <> 'draft'` : undefined));

  const inv = await db
    .select({ i: invoices, clientName: clients.companyName, projectName: projects.name })
    .from(invoices)
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .leftJoin(projects, eq(projects.id, invoices.projectId))
    .where(and(...base(invoices.clientId, invoices.projectId as never), isClient ? sql`${invoices.status} not in ('draft','void')` : undefined));

  const rec = await db
    .select({ p: payments, clientName: clients.companyName, projectName: projects.name })
    .from(payments)
    .innerJoin(clients, eq(clients.id, payments.clientId))
    .leftJoin(projects, eq(projects.id, payments.projectId))
    .where(and(...base(payments.clientId, payments.projectId as never)));

  const docs = await db
    .select({ d: documents, clientName: clients.companyName, projectName: projects.name })
    .from(documents)
    .innerJoin(clients, eq(clients.id, documents.clientId))
    .leftJoin(projects, eq(projects.id, documents.projectId))
    .where(and(...base(documents.clientId, documents.projectId as never), isClient ? eq(documents.clientVisible, true) : undefined));

  const p = isClient ? "/portal" : "";
  const rows: DocumentRow[] = [
    ...ag.map((r) => ({
      id: r.a.id,
      kind: "agreement" as const,
      name: r.a.title,
      status: r.a.status,
      date: r.a.createdAt,
      clientId: r.a.clientId,
      clientName: r.clientName,
      projectId: r.a.projectId,
      projectName: r.projectName,
      href: `${p}/agreements/${r.a.id}`,
      downloadHref: `/api/pdf/agreement/${r.a.id}`,
    })),
    ...inv.map((r) => ({
      id: r.i.id,
      kind: "invoice" as const,
      name: `Invoice ${r.i.number}`,
      status: r.i.status,
      date: r.i.issueDate,
      clientId: r.i.clientId,
      clientName: r.clientName,
      projectId: r.i.projectId,
      projectName: r.projectName,
      href: `${p}/invoices/${r.i.id}`,
      downloadHref: `/api/pdf/invoice/${r.i.id}`,
      amount: r.i.total,
    })),
    ...rec.map((r) => ({
      id: r.p.id,
      kind: "receipt" as const,
      name: `Receipt — ${formatMoney(r.p.amount)}`,
      status: "issued",
      date: r.p.receivedAt,
      clientId: r.p.clientId,
      clientName: r.clientName,
      projectId: r.p.projectId,
      projectName: r.projectName,
      href: `/api/pdf/receipt/${r.p.id}?inline=1`,
      downloadHref: `/api/pdf/receipt/${r.p.id}`,
      amount: r.p.amount,
    })),
    ...docs.map((r) => ({
      id: r.d.id,
      kind: r.d.type as DocumentRow["kind"],
      name: r.d.name,
      status: r.d.status,
      date: r.d.createdAt,
      clientId: r.d.clientId,
      clientName: r.clientName,
      projectId: r.d.projectId,
      projectName: r.projectName,
      href: r.d.fileId ? `/api/files/${r.d.fileId}?inline=1` : "#",
      downloadHref: r.d.fileId ? `/api/files/${r.d.fileId}` : null,
    })),
  ];
  return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function createDocument(
  input: { clientId: string; projectId?: string | null; type: "proposal" | "brief" | "receipt" | "other" | "agreement" | "invoice"; name: string; fileId: string; clientVisible: boolean },
  actor: Actor,
) {
  if (!input.name.trim()) throw invalid("Give the document a name.");
  const [doc] = await db
    .insert(documents)
    .values({ ...input, projectId: input.projectId || null, createdById: actor.id })
    .returning();
  await logActivity({ clientId: input.clientId, projectId: input.projectId, actorId: actor.id, event: "document.added", description: `Document added: ${input.name}`, clientVisible: input.clientVisible });
  return doc;
}

export async function deleteDocument(id: string) {
  await db.delete(documents).where(eq(documents.id, id));
}

export async function recentDocumentsCount() {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(documents);
  return r?.n ?? 0;
}

export { desc };

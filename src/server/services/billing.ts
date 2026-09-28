import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db, type DbOrTx } from "@/server/db/client";
import {
  clients,
  deploymentItems,
  invoiceItems,
  invoices,
  paymentMilestones,
  payments,
  projects,
  users,
} from "@/server/db/schema";
import { projectScope } from "@/server/auth/permissions";
import type { Actor } from "@/server/auth/session";
import { invalid, notFound } from "@/server/errors";
import { formatMoney } from "@/lib/format";
import { logActivity } from "./activity";
import { emit } from "./notifications";
import { getAgency, getSetting, setSetting } from "./settings";
import { handleEvent } from "./workflow-engine";

/* ───────────── Invoice numbers ───────────── */

async function nextInvoiceNumber(tx: DbOrTx) {
  const agency = await getAgency(tx);
  const year = new Date().getFullYear();
  const seq = await getSetting<{ year: number; next: number }>("invoice_sequence", { year, next: 1 }, tx);
  let next = seq.year === year ? seq.next : 1;
  // Guard against collisions (e.g. manual edits).
  for (;;) {
    const number = `${agency.invoicePrefix}-${year}-${String(next).padStart(3, "0")}`;
    const [exists] = await tx.select({ id: invoices.id }).from(invoices).where(eq(invoices.number, number));
    if (!exists) {
      await setSetting("invoice_sequence", { year, next: next + 1 }, tx);
      return number;
    }
    next++;
  }
}

/* ───────────── Invoices ───────────── */

export interface InvoiceInput {
  clientId: string;
  projectId?: string | null;
  issueDate: string;
  dueDate?: string | null;
  notes?: string | null;
  items: { description: string; quantity: number; unitPrice: number }[];
  milestoneIds?: string[];
}

export async function createInvoice(input: InvoiceInput, actor: Actor) {
  const items = input.items.filter((i) => i.description.trim());
  if (!items.length) throw invalid("Add at least one line item.");
  for (const i of items) {
    if (!Number.isInteger(i.quantity) || i.quantity < 1) throw invalid("Quantities must be whole numbers of 1 or more.");
    if (!Number.isFinite(i.unitPrice) || i.unitPrice < 0) throw invalid("Prices must be valid amounts.");
  }
  return db.transaction(async (tx) => {
    const number = await nextInvoiceNumber(tx);
    const lines = items.map((i, idx) => ({ ...i, position: idx, amount: i.quantity * i.unitPrice }));
    const total = lines.reduce((s, l) => s + l.amount, 0);
    const [inv] = await tx
      .insert(invoices)
      .values({
        number,
        clientId: input.clientId,
        projectId: input.projectId || null,
        issueDate: input.issueDate,
        dueDate: input.dueDate || null,
        notes: input.notes,
        subtotal: total,
        total,
        createdById: actor.id,
      })
      .returning();
    await tx.insert(invoiceItems).values(lines.map((l) => ({ ...l, invoiceId: inv.id })));
    if (input.milestoneIds?.length) {
      await tx.update(paymentMilestones).set({ invoiceId: inv.id }).where(inArray(paymentMilestones.id, input.milestoneIds));
    }
    await logActivity(
      { clientId: input.clientId, projectId: input.projectId, actorId: actor.id, event: "invoice.created", description: `Invoice ${number} generated (${formatMoney(total)})` },
      tx,
    );
    await emit(
      { event: "invoice.created", actorId: actor.id, clientId: input.clientId, projectId: input.projectId, title: `Invoice ${number} generated`, staff: { href: `/invoices/${inv.id}` } },
      tx,
    );
    return inv;
  });
}

export async function getInvoice(invoiceId: string) {
  const [row] = await db
    .select({ invoice: invoices, client: clients, projectName: projects.name })
    .from(invoices)
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .leftJoin(projects, eq(projects.id, invoices.projectId))
    .where(eq(invoices.id, invoiceId));
  if (!row) throw notFound("Invoice");
  const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId)).orderBy(asc(invoiceItems.position));
  const paid = await db.select().from(payments).where(eq(payments.invoiceId, invoiceId)).orderBy(asc(payments.receivedAt));
  const amountPaid = paid.reduce((s, p) => s + p.amount, 0);
  const agency = await getAgency();
  return { ...row, items, payments: paid, amountPaid, balance: Math.max(0, row.invoice.total - amountPaid), agency };
}

export type InvoiceDetail = Awaited<ReturnType<typeof getInvoice>>;

export async function listInvoices(actor: Actor, filter: { clientId?: string; projectId?: string } = {}) {
  const conds: (SQL | undefined)[] = [];
  if (actor.role === "client") conds.push(eq(invoices.clientId, actor.clientId!), sql`${invoices.status} <> 'draft'`);
  else if (actor.role === "team") {
    const scope = projectScope(actor);
    conds.push(sql`${invoices.projectId} in (select ${projects.id} from ${projects} where ${scope})`);
  }
  if (filter.clientId) conds.push(eq(invoices.clientId, filter.clientId));
  if (filter.projectId) conds.push(eq(invoices.projectId, filter.projectId));
  return db
    .select({
      id: invoices.id,
      number: invoices.number,
      status: invoices.status,
      total: invoices.total,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      clientId: invoices.clientId,
      clientName: clients.companyName,
      projectId: invoices.projectId,
      projectName: projects.name,
      paid: sql<number>`(select coalesce(sum(p.amount),0)::int from payments p where p.invoice_id = ${invoices.id})`,
    })
    .from(invoices)
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .leftJoin(projects, eq(projects.id, invoices.projectId))
    .where(conds.length ? and(...conds.filter(Boolean)) : undefined)
    .orderBy(desc(invoices.createdAt));
}

export async function markInvoiceSent(invoiceId: string, actor: Actor) {
  const inv = await getInvoice(invoiceId);
  if (inv.invoice.status === "void") throw invalid("This invoice has been voided.");
  if (inv.invoice.status === "draft") {
    await db.update(invoices).set({ status: "sent", sentAt: new Date() }).where(eq(invoices.id, invoiceId));
  } else {
    await db.update(invoices).set({ sentAt: new Date() }).where(eq(invoices.id, invoiceId));
  }
  await logActivity({
    clientId: inv.client.id,
    projectId: inv.invoice.projectId,
    actorId: actor.id,
    event: "invoice.sent",
    description: `Invoice ${inv.invoice.number} sent to client`,
    clientVisible: true,
  });
  await emit({
    event: "invoice.sent",
    actorId: actor.id,
    clientId: inv.client.id,
    projectId: inv.invoice.projectId,
    title: `Invoice ${inv.invoice.number} sent`,
    staff: false,
    client: { href: `/portal/invoices/${invoiceId}`, title: `New invoice ${inv.invoice.number}`, body: `Amount due: ${formatMoney(inv.balance)}` },
  });
}

export async function voidInvoice(invoiceId: string, actor: Actor) {
  const inv = await getInvoice(invoiceId);
  if (inv.amountPaid > 0) throw invalid("Invoices with recorded payments can't be voided.");
  await db.update(invoices).set({ status: "void" }).where(eq(invoices.id, invoiceId));
  await db.update(paymentMilestones).set({ invoiceId: null }).where(eq(paymentMilestones.invoiceId, invoiceId));
  await logActivity({ clientId: inv.client.id, projectId: inv.invoice.projectId, actorId: actor.id, event: "invoice.void", description: `Invoice ${inv.invoice.number} voided` });
}

async function syncInvoiceStatus(invoiceId: string, tx: DbOrTx) {
  const [inv] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!inv || inv.status === "void") return;
  const [{ paid }] = await tx
    .select({ paid: sql<number>`coalesce(sum(${payments.amount}),0)::int` })
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId));
  const status = paid >= inv.total ? "paid" : paid > 0 ? "partially_paid" : inv.sentAt ? "sent" : inv.status;
  await tx
    .update(invoices)
    .set({ status, paidAt: status === "paid" ? (inv.paidAt ?? new Date()) : null })
    .where(eq(invoices.id, invoiceId));
}

async function syncMilestoneStatus(milestoneId: string, tx: DbOrTx) {
  const [m] = await tx.select().from(paymentMilestones).where(eq(paymentMilestones.id, milestoneId));
  if (!m) return null;
  const [{ paid }] = await tx
    .select({ paid: sql<number>`coalesce(sum(${payments.amount}),0)::int` })
    .from(payments)
    .where(eq(payments.milestoneId, milestoneId));
  const isPaid = paid >= m.amount;
  await tx
    .update(paymentMilestones)
    .set({ status: isPaid ? "paid" : "pending", paidAt: isPaid ? (m.paidAt ?? new Date()) : null })
    .where(eq(paymentMilestones.id, milestoneId));
  return { ...m, becamePaid: isPaid && m.status !== "paid" };
}

/* ───────────── Payments ───────────── */

export interface RecordPaymentInput {
  projectId: string;
  milestoneId?: string | null;
  invoiceId?: string | null;
  amount: number;
  method: (typeof payments.$inferInsert)["method"];
  reference?: string | null;
  notes?: string | null;
  receivedAt: Date;
  provider?: string;
  providerPaymentId?: string | null;
}

/**
 * Record money that has actually been received. This is the single entry point
 * for manual entries today and for payment-gateway webhooks later.
 */
export async function recordPayment(input: RecordPaymentInput, actor: Pick<Actor, "id"> | null, tx0?: DbOrTx) {
  if (!Number.isInteger(input.amount) || input.amount <= 0) throw invalid("Enter an amount greater than zero.");
  const run = async (tx: DbOrTx) => {
    const [project] = await tx.select().from(projects).where(eq(projects.id, input.projectId));
    if (!project) throw notFound("Project");
    let invoiceId = input.invoiceId || null;
    if (input.milestoneId) {
      const [m] = await tx
        .select()
        .from(paymentMilestones)
        .where(and(eq(paymentMilestones.id, input.milestoneId), eq(paymentMilestones.projectId, project.id)));
      if (!m) throw invalid("That payment milestone doesn't belong to this project.");
      invoiceId = invoiceId ?? m.invoiceId;
    }
    const [payment] = await tx
      .insert(payments)
      .values({
        clientId: project.clientId,
        projectId: project.id,
        milestoneId: input.milestoneId || null,
        invoiceId,
        amount: input.amount,
        method: input.method,
        reference: input.reference,
        notes: input.notes,
        receivedAt: input.receivedAt,
        provider: input.provider ?? "manual",
        providerPaymentId: input.providerPaymentId,
        recordedById: actor?.id ?? null,
      })
      .returning();

    let milestoneLabel = "";
    if (input.milestoneId) {
      const m = await syncMilestoneStatus(input.milestoneId, tx);
      milestoneLabel = m?.label ?? "";
      if (m?.becamePaid && m.kind === "advance") await handleEvent(project.id, "payment.advance_received", tx);
      if (m?.becamePaid && m.kind === "final") {
        await handleEvent(project.id, "payment.final_received", tx);
        await tx
          .update(deploymentItems)
          .set({ isDone: true, doneAt: new Date(), doneById: actor?.id ?? null })
          .where(and(eq(deploymentItems.projectId, project.id), eq(deploymentItems.key, "final_payment")));
      }
    }
    if (invoiceId) await syncInvoiceStatus(invoiceId, tx);

    const label = milestoneLabel ? `${milestoneLabel} of ${formatMoney(input.amount)}` : `Payment of ${formatMoney(input.amount)}`;
    await logActivity(
      { clientId: project.clientId, projectId: project.id, actorId: actor?.id, event: "payment.received", description: `${label} recorded`, clientVisible: true },
      tx,
    );
    await emit(
      {
        event: "payment.received",
        actorId: actor?.id,
        clientId: project.clientId,
        projectId: project.id,
        title: `Payment received — ${formatMoney(input.amount)}`,
        body: milestoneLabel || undefined,
        staff: { href: `/projects/${project.id}?tab=payments` },
        client: { href: "/portal/billing", title: "Payment received — thank you!", body: `${label} has been received.` },
      },
      tx,
    );
    return payment;
  };
  return tx0 ? run(tx0) : db.transaction(run);
}

export async function deletePayment(paymentId: string, actor: Actor) {
  return db.transaction(async (tx) => {
    const [p] = await tx.select().from(payments).where(eq(payments.id, paymentId));
    if (!p) throw notFound("Payment");
    await tx.delete(payments).where(eq(payments.id, paymentId));
    if (p.milestoneId) await syncMilestoneStatus(p.milestoneId, tx);
    if (p.invoiceId) await syncInvoiceStatus(p.invoiceId, tx);
    await logActivity(
      { clientId: p.clientId, projectId: p.projectId, actorId: actor.id, event: "payment.deleted", description: `Payment of ${formatMoney(p.amount)} removed` },
      tx,
    );
  });
}

export async function getProjectBilling(projectId: string) {
  const milestones = await db
    .select({
      milestone: paymentMilestones,
      invoiceNumber: invoices.number,
      received: sql<number>`(select coalesce(sum(p.amount),0)::int from payments p where p.milestone_id = ${paymentMilestones.id})`,
    })
    .from(paymentMilestones)
    .leftJoin(invoices, eq(invoices.id, paymentMilestones.invoiceId))
    .where(eq(paymentMilestones.projectId, projectId))
    .orderBy(asc(paymentMilestones.position));
  const paymentRows = await db
    .select({ payment: payments, recordedBy: users.name, milestoneLabel: paymentMilestones.label, invoiceNumber: invoices.number })
    .from(payments)
    .leftJoin(users, eq(users.id, payments.recordedById))
    .leftJoin(paymentMilestones, eq(paymentMilestones.id, payments.milestoneId))
    .leftJoin(invoices, eq(invoices.id, payments.invoiceId))
    .where(eq(payments.projectId, projectId))
    .orderBy(desc(payments.receivedAt));
  const scheduled = milestones.reduce((s, m) => s + m.milestone.amount, 0);
  const paid = paymentRows.reduce((s, p) => s + p.payment.amount, 0);
  return { milestones, payments: paymentRows, scheduled, paid, pending: Math.max(0, scheduled - paid) };
}

export async function addMilestone(projectId: string, input: { label: string; kind: "advance" | "final" | "annual" | "other"; amount: number; dueDate?: string | null }) {
  if (!input.label.trim()) throw invalid("Give the milestone a name.");
  if (!Number.isInteger(input.amount) || input.amount <= 0) throw invalid("Enter an amount greater than zero.");
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${paymentMilestones.position}),0)::int` })
    .from(paymentMilestones)
    .where(eq(paymentMilestones.projectId, projectId));
  await db.insert(paymentMilestones).values({ projectId, position: max + 1, ...input, dueDate: input.dueDate || null });
}

export async function updateMilestone(projectId: string, milestoneId: string, input: { label: string; amount: number; dueDate?: string | null }) {
  await db
    .update(paymentMilestones)
    .set({ label: input.label, amount: input.amount, dueDate: input.dueDate || null })
    .where(and(eq(paymentMilestones.id, milestoneId), eq(paymentMilestones.projectId, projectId)));
  await syncMilestoneStatus(milestoneId, db);
}

export async function deleteMilestone(projectId: string, milestoneId: string) {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(payments).where(eq(payments.milestoneId, milestoneId));
  if (n > 0) throw invalid("This milestone has payments recorded against it.");
  await db.delete(paymentMilestones).where(and(eq(paymentMilestones.id, milestoneId), eq(paymentMilestones.projectId, projectId)));
}

/** Agency-wide payment overview. */
export async function paymentsOverview(actor: Actor) {
  const scope = projectScope(actor);
  const milestones = await db
    .select({
      id: paymentMilestones.id,
      label: paymentMilestones.label,
      kind: paymentMilestones.kind,
      amount: paymentMilestones.amount,
      status: paymentMilestones.status,
      dueDate: paymentMilestones.dueDate,
      paidAt: paymentMilestones.paidAt,
      projectId: projects.id,
      projectName: projects.name,
      clientName: clients.companyName,
      clientId: clients.id,
      received: sql<number>`(select coalesce(sum(p.amount),0)::int from payments p where p.milestone_id = ${paymentMilestones.id})`,
    })
    .from(paymentMilestones)
    .innerJoin(projects, eq(projects.id, paymentMilestones.projectId))
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .where(scope)
    .orderBy(asc(paymentMilestones.status), asc(paymentMilestones.dueDate));
  const recent = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      method: payments.method,
      reference: payments.reference,
      receivedAt: payments.receivedAt,
      projectId: projects.id,
      projectName: projects.name,
      clientName: clients.companyName,
    })
    .from(payments)
    .innerJoin(projects, eq(projects.id, payments.projectId))
    .innerJoin(clients, eq(clients.id, payments.clientId))
    .where(scope)
    .orderBy(desc(payments.receivedAt))
    .limit(50);
  const totalPaid = milestones.reduce((s, m) => s + Math.min(m.received, m.amount), 0);
  const totalScheduled = milestones.reduce((s, m) => s + m.amount, 0);
  return { milestones, recent, totalPaid, totalPending: Math.max(0, totalScheduled - totalPaid), totalScheduled };
}

export async function getPaymentForReceipt(paymentId: string) {
  const [row] = await db
    .select({ payment: payments, clientName: clients.companyName, clientAddress: clients.address, projectName: projects.name, milestoneLabel: paymentMilestones.label, invoiceNumber: invoices.number })
    .from(payments)
    .innerJoin(clients, eq(clients.id, payments.clientId))
    .leftJoin(projects, eq(projects.id, payments.projectId))
    .leftJoin(paymentMilestones, eq(paymentMilestones.id, payments.milestoneId))
    .leftJoin(invoices, eq(invoices.id, payments.invoiceId))
    .where(eq(payments.id, paymentId));
  if (!row) throw notFound("Payment");
  return { ...row, agency: await getAgency() };
}

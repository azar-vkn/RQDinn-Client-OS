"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireStaff } from "@/server/auth/session";
import { assertClientAccess, assertProjectAccess } from "@/server/auth/permissions";
import { db } from "@/server/db/client";
import { invoices, payments } from "@/server/db/schema";
import {
  addMilestone,
  createInvoice,
  deleteMilestone,
  deletePayment,
  markInvoiceSent,
  recordPayment,
  updateMilestone,
  voidInvoice,
} from "@/server/services/billing";
import { PAYMENT_METHODS } from "@/lib/constants";
import { rupeesToPaise } from "@/lib/validators";
import { notFound } from "@/server/errors";
import { formObject, run } from "./run";
import { money, optionalDate, optionalText, optionalUuid, requiredText, uuid } from "./schemas";

const paymentSchema = z.object({
  projectId: uuid,
  milestoneId: optionalUuid,
  invoiceId: optionalUuid,
  amount: money("Amount", { required: true }),
  method: z.enum(PAYMENT_METHODS.map((m) => m.value) as [string, ...string[]]),
  reference: optionalText(200),
  notes: optionalText(2000),
  receivedAt: z
    .string()
    .min(1, "Enter the date the payment was received.")
    .transform((v) => new Date(v))
    .refine((d) => !Number.isNaN(d.getTime()) && d.getTime() <= Date.now() + 86_400_000, "The received date can't be in the future."),
});

export async function recordPaymentAction(fd: FormData) {
  return run(async () => {
    const actor = await requireStaff();
    const input = paymentSchema.parse(formObject(fd));
    await assertProjectAccess(actor, input.projectId);
    await recordPayment({ ...input, method: input.method as never }, actor);
  }, "Payment recorded.");
}

export async function deletePaymentAction(paymentId: string) {
  return run(async () => {
    const actor = await requireStaff();
    const [p] = await db.select().from(payments).where(eq(payments.id, uuid.parse(paymentId)));
    if (!p) throw notFound("Payment");
    if (p.projectId) await assertProjectAccess(actor, p.projectId);
    await deletePayment(p.id, actor);
  }, "Payment removed.");
}

const milestoneSchema = z.object({
  label: requiredText("Label", 120),
  kind: z.enum(["advance", "final", "annual", "other"]).default("other"),
  amount: money("Amount", { required: true }),
  dueDate: optionalDate,
});

export async function addMilestoneAction(projectId: string, fd: FormData) {
  return run(async () => {
    const actor = await requireStaff();
    await assertProjectAccess(actor, projectId);
    await addMilestone(projectId, milestoneSchema.parse(formObject(fd)));
  }, "Milestone added.");
}

export async function updateMilestoneAction(projectId: string, milestoneId: string, fd: FormData) {
  return run(async () => {
    const actor = await requireStaff();
    await assertProjectAccess(actor, projectId);
    const m = milestoneSchema.parse(formObject(fd));
    await updateMilestone(projectId, uuid.parse(milestoneId), m);
  }, "Milestone updated.");
}

export async function deleteMilestoneAction(projectId: string, milestoneId: string) {
  return run(async () => {
    const actor = await requireStaff();
    await assertProjectAccess(actor, projectId);
    await deleteMilestone(projectId, uuid.parse(milestoneId));
  }, "Milestone removed.");
}

const invoiceSchema = z.object({
  clientId: uuid,
  projectId: optionalUuid,
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the invoice date."),
  dueDate: optionalDate,
  notes: optionalText(3000),
  items: z
    .array(
      z.object({
        description: z.string().trim().max(300),
        quantity: z.coerce.number().int("Quantity must be a whole number.").min(1),
        unitPrice: z.union([z.string(), z.number()]).transform((v, ctx) => {
          const p = rupeesToPaise(v as string);
          if (!Number.isFinite(p)) {
            ctx.addIssue({ code: "custom", message: "Enter valid prices." });
            return z.NEVER;
          }
          return p;
        }),
      }),
    )
    .min(1, "Add at least one line item."),
  milestoneIds: z.array(z.string().uuid()).default([]),
});

export async function createInvoiceAction(input: unknown) {
  return run(async () => {
    const actor = await requireStaff();
    const data = invoiceSchema.parse(input);
    await assertClientAccess(actor, data.clientId);
    if (data.projectId) await assertProjectAccess(actor, data.projectId);
    const inv = await createInvoice(data, actor);
    return { id: inv.id, number: inv.number };
  }, "Invoice generated.");
}

async function authorizeInvoice(invoiceId: string) {
  const actor = await requireStaff();
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, uuid.parse(invoiceId)));
  if (!inv) throw notFound("Invoice");
  await assertClientAccess(actor, inv.clientId);
  return actor;
}

export async function markInvoiceSentAction(invoiceId: string) {
  return run(async () => {
    const actor = await authorizeInvoice(invoiceId);
    await markInvoiceSent(invoiceId, actor);
  }, "Invoice marked as sent. The client can now see it in their portal.");
}

export async function voidInvoiceAction(invoiceId: string) {
  return run(async () => {
    const actor = await authorizeInvoice(invoiceId);
    await voidInvoice(invoiceId, actor);
  }, "Invoice voided.");
}

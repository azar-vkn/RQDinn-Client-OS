"use client";

import * as React from "react";
import Link from "next/link";
import { CircleDollarSign, Plus, Receipt, Trash2, Info } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { ActionForm } from "@/components/shared/action-form";
import { SelectField, SubmitButton, TextAreaField, TextField } from "@/components/shared/form-fields";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/layout";
import { Progress } from "@/components/ui/misc";
import { useAction } from "@/hooks/use-action";
import { addMilestoneAction, deleteMilestoneAction, deletePaymentAction, recordPaymentAction } from "@/server/actions/billing";
import { PAYMENT_METHODS, labelFor } from "@/lib/constants";
import { formatDate, formatMoney, paiseToRupees, toDateTimeInput } from "@/lib/format";

export interface MilestoneView {
  id: string;
  label: string;
  kind: string;
  amount: number;
  status: string;
  dueDate: string | null;
  paidAt: Date | string | null;
  invoiceId: string | null;
  invoiceNumber: string | null;
  received: number;
}
export interface PaymentView {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  receivedAt: Date | string;
  recordedBy: string | null;
  milestoneLabel: string | null;
  invoiceNumber: string | null;
}
export interface InvoiceView {
  id: string;
  number: string;
  status: string;
  total: number;
  paid: number;
  issueDate: string;
}

export function RecordPaymentDialog({ projectId, milestone, trigger }: { projectId: string; milestone?: MilestoneView; trigger: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const balance = milestone ? Math.max(0, milestone.amount - milestone.received) : 0;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title="Record payment" description={milestone ? `${milestone.label} · ${formatMoney(milestone.amount)}` : "Record money received for this project."}>
        <div className="mb-4 flex gap-2.5 rounded-xl bg-sky-soft/70 p-3 text-xs text-sky">
          <Info className="mt-0.5 size-4 shrink-0" />
          Only record payments that have actually reached RQdinn&apos;s account. Online gateway payments (Razorpay) will be recorded automatically once integrated.
        </div>
        <ActionForm action={recordPaymentAction} onSuccess={() => setOpen(false)} className="space-y-4">
          <input type="hidden" name="projectId" value={projectId} />
          {milestone && <input type="hidden" name="milestoneId" value={milestone.id} />}
          {milestone?.invoiceId && <input type="hidden" name="invoiceId" value={milestone.invoiceId} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="amount" label="Amount received (₹)" required inputMode="decimal" defaultValue={milestone ? paiseToRupees(balance) : ""} />
            <TextField name="receivedAt" label="Received on" type="datetime-local" required defaultValue={toDateTimeInput(new Date())} />
            <SelectField name="method" label="Method" options={PAYMENT_METHODS} defaultValue="upi" />
            <TextField name="reference" label="Reference / UTR" placeholder="e.g. UPI ref no." />
          </div>
          <TextAreaField name="notes" label="Notes" rows={2} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <SubmitButton variant="success" loadingText="Recording…">
              Record payment
            </SubmitButton>
          </DialogFooter>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

function AddMilestoneDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <Plus /> Milestone
        </Button>
      </DialogTrigger>
      <DialogContent title="Add payment milestone">
        <ActionForm action={addMilestoneAction.bind(null, projectId)} onSuccess={() => setOpen(false)} className="space-y-4">
          <TextField name="label" label="Label" required placeholder="e.g. Additional pages" />
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField name="amount" label="Amount (₹)" required inputMode="decimal" />
            <SelectField name="kind" label="Type" options={[{ value: "other", label: "Other" }, { value: "advance", label: "Advance" }, { value: "final", label: "Final" }, { value: "annual", label: "Annual" }]} />
            <TextField name="dueDate" label="Due date" type="date" />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <SubmitButton>Add milestone</SubmitButton>
          </DialogFooter>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

export function PaymentsPanel({
  projectId,
  clientId,
  milestones,
  payments,
  invoices,
  scheduled,
  paid,
}: {
  projectId: string;
  clientId: string;
  milestones: MilestoneView[];
  payments: PaymentView[];
  invoices: InvoiceView[];
  scheduled: number;
  paid: number;
}) {
  const delPayment = useAction(deletePaymentAction, { success: "Payment removed." });
  const delMilestone = useAction(deleteMilestoneAction, { success: "Milestone removed." });
  const pending = Math.max(0, scheduled - paid);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-[13px] text-muted">Total</p>
          <p className="mt-1 font-serif text-3xl font-medium">{formatMoney(scheduled)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[13px] text-muted">Total paid</p>
          <p className="mt-1 font-serif text-3xl font-medium text-green-dark">{formatMoney(paid)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[13px] text-muted">Total pending</p>
          <p className="mt-1 font-serif text-3xl font-medium text-orange-dark">{formatMoney(pending)}</p>
        </Card>
      </div>
      {scheduled > 0 && <Progress value={(paid / scheduled) * 100} tone="green" />}

      <Card>
        <CardHeader title="Payment schedule" description="Advance, final and annual payments for this project." action={<AddMilestoneDialog projectId={projectId} />} />
        {milestones.length ? (
          <ul className="divide-y divide-line-soft">
            {milestones.map((m) => {
              const balance = Math.max(0, m.amount - m.received);
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{m.label}</p>
                    <p className="text-xs text-muted">
                      {m.status === "paid" ? `Paid ${formatDate(m.paidAt)}` : m.received > 0 ? `${formatMoney(m.received)} received · ${formatMoney(balance)} due` : m.dueDate ? `Due ${formatDate(m.dueDate)}` : "Awaiting payment"}
                      {m.invoiceNumber ? ` · ${m.invoiceNumber}` : ""}
                    </p>
                  </div>
                  <p className="font-semibold text-ink">{formatMoney(m.amount)}</p>
                  <StatusBadge kind="milestone" value={m.status} />
                  <div className="flex gap-1">
                    {m.status !== "paid" && (
                      <RecordPaymentDialog
                        projectId={projectId}
                        milestone={m}
                        trigger={
                          <Button size="sm" variant="success">
                            <CircleDollarSign /> Record
                          </Button>
                        }
                      />
                    )}
                    {m.received === 0 && (
                      <Button size="icon-sm" variant="ghost" aria-label="Remove milestone" onClick={() => confirm(`Remove “${m.label}”?`) && delMilestone.execute(projectId, m.id)}>
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState compact icon={<CircleDollarSign />} title="No payment schedule" description="Add milestones to track what's due." />
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Invoices"
            action={
              <Button size="sm" asChild>
                <Link href={`/invoices/new?projectId=${projectId}&clientId=${clientId}`}>
                  <Plus /> Generate invoice
                </Link>
              </Button>
            }
          />
          {invoices.length ? (
            <ul className="divide-y divide-line-soft">
              {invoices.map((i) => (
                <li key={i.id}>
                  <Link href={`/invoices/${i.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-cream/40">
                    <div>
                      <p className="text-sm font-medium text-ink">{i.number}</p>
                      <p className="text-xs text-muted">{formatDate(i.issueDate)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">{formatMoney(i.total)}</span>
                      <StatusBadge kind="invoice" value={i.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact icon={<Receipt />} title="No invoices yet" />
          )}
        </Card>
        <Card>
          <CardHeader title="Payments received" action={<RecordPaymentDialog projectId={projectId} trigger={<Button size="sm" variant="secondary"><Plus /> Other payment</Button>} />} />
          {payments.length ? (
            <ul className="divide-y divide-line-soft">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-green-dark">{formatMoney(p.amount)}</p>
                    <p className="truncate text-xs text-muted">
                      {formatDate(p.receivedAt)} · {labelFor(PAYMENT_METHODS, p.method)}
                      {p.reference ? ` · ${p.reference}` : ""}
                      {p.milestoneLabel ? ` · ${p.milestoneLabel}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" asChild>
                      <a href={`/api/pdf/receipt/${p.id}?inline=1`} target="_blank" rel="noreferrer">
                        Receipt
                      </a>
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label="Remove payment" onClick={() => confirm("Remove this payment record? Milestone and invoice statuses will update.") && delPayment.execute(p.id)}>
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact icon={<CircleDollarSign />} title="No payments recorded yet" />
          )}
        </Card>
      </div>
    </div>
  );
}

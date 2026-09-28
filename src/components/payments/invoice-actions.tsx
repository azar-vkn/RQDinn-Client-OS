"use client";

import { Ban, CircleDollarSign, Download, Printer, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { markInvoiceSentAction, voidInvoiceAction } from "@/server/actions/billing";
import { RecordPaymentDialog, type MilestoneView } from "./payments-panel";

export function InvoiceActions({
  invoiceId,
  status,
  sentAt,
  projectId,
  balance,
  openMilestones,
}: {
  invoiceId: string;
  status: string;
  sentAt: Date | string | null;
  projectId: string | null;
  balance: number;
  openMilestones: MilestoneView[];
}) {
  const send = useAction(markInvoiceSentAction);
  const voidIt = useAction(voidInvoiceAction);
  const payable = status !== "paid" && status !== "void" && projectId;

  return (
    <>
      <Button variant="secondary" asChild>
        <a href={`/api/pdf/invoice/${invoiceId}`}>
          <Download /> Download PDF
        </a>
      </Button>
      <Button variant="secondary" onClick={() => window.print()} className="hidden sm:inline-flex">
        <Printer /> Print
      </Button>
      {status !== "void" && status !== "paid" && (
        <Button variant="secondary" loading={send.pending} onClick={() => send.execute(invoiceId)}>
          <Send /> {sentAt ? "Resend" : "Mark as sent"}
        </Button>
      )}
      {payable &&
        (openMilestones.length ? (
          openMilestones.map((m) => (
            <RecordPaymentDialog
              key={m.id}
              projectId={projectId!}
              milestone={m}
              trigger={
                <Button variant="success">
                  <CircleDollarSign /> {openMilestones.length === 1 ? "Mark as paid" : `Record ${m.label.toLowerCase()}`}
                </Button>
              }
            />
          ))
        ) : (
          <RecordPaymentDialog
            projectId={projectId!}
            milestone={{ id: "", label: "Invoice balance", kind: "other", amount: balance, received: 0, status: "pending", dueDate: null, paidAt: null, invoiceId, invoiceNumber: null }}
            trigger={
              <Button variant="success">
                <CircleDollarSign /> Mark as paid
              </Button>
            }
          />
        ))}
      {status !== "void" && status !== "paid" && (
        <Button variant="danger-ghost" size="icon" title="Void invoice" loading={voidIt.pending} onClick={() => confirm("Void this invoice? It will no longer count as due.") && voidIt.execute(invoiceId)}>
          <Ban />
        </Button>
      )}
    </>
  );
}

import type { InvoiceDetail } from "@/server/services/billing";
import type { getPaymentForReceipt } from "@/server/services/billing";
import type { AgencySettings } from "@/server/services/settings";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { INVOICE_STATUS_LABEL, PAYMENT_METHODS, labelFor } from "@/lib/constants";
import { PdfWriter, PDF_COLORS } from "./render";

const { MUTED, GREEN } = PDF_COLORS;

export async function invoicePdf(inv: InvoiceDetail) {
  const w = await PdfWriter.create();
  const { invoice, client, agency } = inv;
  w.header(agency, "Invoice", invoice.number);

  const col2 = w.margin + 190;
  const col3 = w.margin + 350;
  w.text("BILLED TO", { size: 7.5, font: w.bold, color: MUTED });
  w.text("INVOICE DATE", { size: 7.5, font: w.bold, color: MUTED, x: col2 });
  w.text("STATUS", { size: 7.5, font: w.bold, color: MUTED, x: col3 });
  w.y -= 14;
  w.text(client.companyName, { size: 11, font: w.bold });
  w.text(formatDate(invoice.issueDate), { size: 10, x: col2 });
  w.text(INVOICE_STATUS_LABEL[invoice.status] ?? invoice.status, { size: 10, x: col3, color: invoice.status === "paid" ? GREEN : undefined });
  w.y -= 13;
  if (client.address) w.text([client.address, client.city].filter(Boolean).join(", "), { size: 8.5, color: MUTED });
  if (invoice.dueDate) w.text(`Due ${formatDate(invoice.dueDate)}`, { size: 8.5, color: MUTED, x: col2 });
  if (inv.projectName) w.text(inv.projectName, { size: 8.5, color: MUTED, x: col3 });
  w.y -= 34;

  // Table
  const right = w.width - w.margin;
  w.text("ITEM", { size: 7.5, font: w.bold, color: MUTED });
  w.text("QTY", { size: 7.5, font: w.bold, color: MUTED, x: right - 190, align: "right" });
  w.text("RATE", { size: 7.5, font: w.bold, color: MUTED, x: right - 100, align: "right" });
  w.text("AMOUNT", { size: 7.5, font: w.bold, color: MUTED, align: "right" });
  w.y -= 8;
  w.rule();
  w.y -= 18;
  for (const item of inv.items) {
    w.ensure(24);
    w.text(item.description, { size: 10 });
    w.text(String(item.quantity), { size: 10, x: right - 190, align: "right", color: MUTED });
    w.text(formatMoney(item.unitPrice), { size: 10, x: right - 100, align: "right", color: MUTED });
    w.text(formatMoney(item.amount), { size: 10, font: w.bold, align: "right" });
    w.y -= 10;
    w.rule();
    w.y -= 18;
  }
  w.y -= 4;
  w.text("Total", { size: 11, font: w.bold, x: right - 190 });
  w.text(formatMoney(invoice.total), { size: 16, font: w.serif, align: "right" });
  w.y -= 18;
  if (inv.amountPaid > 0) {
    w.text("Paid", { size: 10, x: right - 190, color: GREEN });
    w.text(`- ${formatMoney(inv.amountPaid)}`, { size: 10, align: "right", color: GREEN });
    w.y -= 15;
    w.text("Balance due", { size: 10, font: w.bold, x: right - 190 });
    w.text(formatMoney(inv.balance), { size: 10, font: w.bold, align: "right" });
    w.y -= 15;
  }
  w.y -= 26;
  w.ensure(110);
  w.text("PAYMENT DETAILS", { size: 7.5, font: w.bold, color: MUTED });
  w.y -= 14;
  w.paragraph(agency.bankDetails + (agency.upiId ? `\nUPI: ${agency.upiId}` : ""), { size: 9, color: MUTED, lineHeight: 13 });
  if (invoice.notes) {
    w.y -= 10;
    w.text("NOTES", { size: 7.5, font: w.bold, color: MUTED });
    w.y -= 14;
    w.paragraph(invoice.notes, { size: 9, color: MUTED, lineHeight: 13 });
  }
  w.footer(`${agency.legalName} · ${agency.email} · ${agency.phone}${agency.gstin ? ` · GSTIN ${agency.gstin}` : ""}`);
  return w.save();
}

export async function agreementPdf(a: { title: string; body: string; status: string; acceptedAt: Date | null; acceptedName: string | null }, agency: AgencySettings) {
  const w = await PdfWriter.create();
  w.header(agency, a.status === "accepted" ? "Agreement · Accepted" : "Agreement");
  w.paragraph(a.body, { size: 10.5, font: w.serif, lineHeight: 16 });
  if (a.acceptedAt) {
    w.y -= 16;
    w.ensure(60);
    w.rule();
    w.y -= 18;
    w.text(`Accepted by ${a.acceptedName ?? "client"} on ${formatDateTime(a.acceptedAt)}`, { size: 9, font: w.bold, color: GREEN });
    w.y -= 13;
    w.text("Click-through acknowledgement recorded in RQdinn Client OS (not a digital signature).", { size: 8, color: MUTED });
  }
  w.footer(`${a.title} · ${agency.legalName}`);
  return w.save();
}

export async function receiptPdf(r: Awaited<ReturnType<typeof getPaymentForReceipt>>) {
  const w = await PdfWriter.create();
  const short = r.payment.id.slice(0, 8).toUpperCase();
  w.header(r.agency, "Payment receipt", `RCPT-${short}`);
  w.box(96);
  w.y -= 26;
  w.text("AMOUNT RECEIVED", { size: 7.5, font: w.bold, color: MUTED, x: w.margin + 18 });
  w.y -= 30;
  w.text(formatMoney(r.payment.amount, true), { size: 26, font: w.serif, x: w.margin + 18, color: GREEN });
  w.y -= 50;
  const rows: [string, string][] = [
    ["Received from", r.clientName],
    ["Received on", formatDateTime(r.payment.receivedAt)],
    ["Payment method", labelFor(PAYMENT_METHODS, r.payment.method)],
    ["Reference", r.payment.reference ?? "—"],
    ["Project", r.projectName ?? "—"],
    ["For", r.milestoneLabel ?? "Project payment"],
    ["Invoice", r.invoiceNumber ?? "—"],
  ];
  for (const [k, v] of rows) {
    w.text(k, { size: 9, color: MUTED });
    w.text(v, { size: 10, x: w.margin + 150 });
    w.y -= 20;
  }
  w.y -= 20;
  w.paragraph("Thank you for your payment. This receipt confirms that the amount above has been received by RQdinn.", { size: 9, color: MUTED });
  w.footer(`${r.agency.legalName} · ${r.agency.email}`);
  return w.save();
}

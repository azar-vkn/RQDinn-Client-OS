import type { InvoiceDetail } from "@/server/services/billing";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatMoney } from "@/lib/format";
import { PAYMENT_METHODS, labelFor } from "@/lib/constants";

/** Printable invoice (screen + print). */
export function InvoiceDocument({ inv }: { inv: InvoiceDetail }) {
  const { invoice, client, agency } = inv;
  return (
    <article className="mx-auto w-full max-w-3xl rounded-2xl border border-line bg-white p-6 shadow-card sm:p-10 print:border-0 print:p-0 print:shadow-none">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-2xl font-semibold tracking-[0.22em] text-ink">{agency.name}</p>
          <p className="mt-1 text-xs tracking-wide text-muted">{agency.tagline}</p>
          <p className="mt-4 whitespace-pre-line text-xs leading-relaxed text-muted">
            {agency.legalName}
            {"\n"}
            {agency.address}
            {"\n"}
            {agency.email} · {agency.phone}
            {agency.gstin ? `\nGSTIN: ${agency.gstin}` : ""}
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange">Invoice</p>
          <p className="mt-1 font-serif text-3xl">{invoice.number}</p>
          <div className="mt-2 sm:flex sm:justify-end">
            <StatusBadge kind="invoice" value={invoice.status} />
          </div>
        </div>
      </header>

      <div className="mt-8 grid gap-6 rounded-xl bg-cream/60 p-5 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted">Billed to</p>
          <p className="mt-1 font-medium">{client.companyName}</p>
          {client.address && <p className="text-xs text-muted">{[client.address, client.city].filter(Boolean).join(", ")}</p>}
        </div>
        <div>
          <p className="text-xs text-muted">Invoice date</p>
          <p className="mt-1 font-medium">{formatDate(invoice.issueDate)}</p>
          {invoice.dueDate && (
            <>
              <p className="mt-2 text-xs text-muted">Due date</p>
              <p className="font-medium">{formatDate(invoice.dueDate)}</p>
            </>
          )}
        </div>
        <div>
          <p className="text-xs text-muted">Project</p>
          <p className="mt-1 font-medium">{inv.projectName ?? "—"}</p>
        </div>
      </div>

      <table className="mt-8 w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th className="pb-2 font-medium">Item</th>
            <th className="pb-2 text-right font-medium">Qty</th>
            <th className="pb-2 text-right font-medium">Rate</th>
            <th className="pb-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {inv.items.map((i) => (
            <tr key={i.id} className="border-b border-line-soft">
              <td className="py-3 pr-3">{i.description}</td>
              <td className="py-3 text-right text-muted">{i.quantity}</td>
              <td className="py-3 text-right text-muted">{formatMoney(i.unitPrice)}</td>
              <td className="py-3 text-right font-medium">{formatMoney(i.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-end">
        <dl className="w-full max-w-xs space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd>{formatMoney(invoice.subtotal)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd className="font-serif text-2xl font-medium">{formatMoney(invoice.total)}</dd>
          </div>
          {inv.amountPaid > 0 && (
            <>
              <div className="flex justify-between text-green-dark">
                <dt>Paid</dt>
                <dd>− {formatMoney(inv.amountPaid)}</dd>
              </div>
              <div className="flex justify-between font-semibold">
                <dt>Balance due</dt>
                <dd>{formatMoney(inv.balance)}</dd>
              </div>
            </>
          )}
        </dl>
      </div>

      {inv.payments.length > 0 && (
        <div className="mt-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Payments received</p>
          <ul className="space-y-1 text-sm">
            {inv.payments.map((p) => (
              <li key={p.id} className="flex justify-between">
                <span className="text-muted">
                  {formatDate(p.receivedAt)} · {labelFor(PAYMENT_METHODS, p.method)}
                  {p.reference ? ` · ${p.reference}` : ""}
                </span>
                <span>{formatMoney(p.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <footer className="mt-10 grid gap-6 border-t border-line pt-6 text-xs text-muted sm:grid-cols-2">
        <div>
          <p className="mb-1 font-semibold text-ink-soft">Payment details</p>
          <p className="whitespace-pre-line">{agency.bankDetails}</p>
          {agency.upiId && <p className="mt-1">UPI: {agency.upiId}</p>}
        </div>
        {invoice.notes && (
          <div>
            <p className="mb-1 font-semibold text-ink-soft">Notes</p>
            <p className="whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}
      </footer>
    </article>
  );
}

import Link from "next/link";
import { CircleDollarSign, Plus, Receipt } from "lucide-react";
import { requireStaffPage } from "@/server/auth/session";
import { listInvoices, paymentsOverview } from "@/server/services/billing";
import { PageHeader, StatCard, EmptyState } from "@/components/shared/layout";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { PAYMENT_METHODS, labelFor } from "@/lib/constants";
import { daysUntil, formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Payments" };

export default async function PaymentsPage() {
  const user = await requireStaffPage();
  const [o, invoices] = await Promise.all([paymentsOverview(user), listInvoices(user)]);
  const pending = o.milestones.filter((m) => m.status === "pending");

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Payments"
        description="Money in, money due. Payments are recorded when they actually reach RQdinn."
        actions={
          <Button asChild>
            <Link href="/invoices/new">
              <Plus /> New invoice
            </Link>
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total contracted" value={formatMoney(o.totalScheduled)} icon={<Receipt />} />
        <StatCard label="Total paid" value={formatMoney(o.totalPaid)} icon={<CircleDollarSign />} tone="green" />
        <StatCard label="Total pending" value={formatMoney(o.totalPending)} icon={<CircleDollarSign />} tone="orange" />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Pending payments" description={`${pending.length} milestone${pending.length === 1 ? "" : "s"} awaiting payment`} />
          {pending.length ? (
            <ul className="divide-y divide-line-soft">
              {pending.map((m) => {
                const due = daysUntil(m.dueDate);
                return (
                  <li key={m.id}>
                    <Link href={`/projects/${m.projectId}?tab=payments`} className="flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-cream/40">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {m.clientName} · {m.label}
                        </p>
                        <p className={cn("truncate text-xs", due !== null && due < 0 ? "text-danger" : "text-muted")}>
                          {m.projectName}
                          {m.dueDate ? ` · due ${formatDate(m.dueDate)}` : ""}
                          {m.received > 0 ? ` · ${formatMoney(m.received)} received` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold">{formatMoney(m.amount - m.received)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState compact icon={<CircleDollarSign />} title="Nothing pending" description="Every scheduled payment has been received." />
          )}
        </Card>

        <Card>
          <CardHeader title="Recently received" />
          {o.recent.length ? (
            <ul className="divide-y divide-line-soft">
              {o.recent.slice(0, 12).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.clientName}</p>
                    <p className="truncate text-xs text-muted">
                      {formatDate(p.receivedAt)} · {labelFor(PAYMENT_METHODS, p.method)}
                      {p.reference ? ` · ${p.reference}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-green-dark">{formatMoney(p.amount)}</span>
                    <Button size="sm" variant="ghost" asChild>
                      <a href={`/api/pdf/receipt/${p.id}?inline=1`} target="_blank" rel="noreferrer">
                        Receipt
                      </a>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact title="No payments recorded yet" />
          )}
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader title="Invoices" />
        {invoices.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line-soft text-left text-xs text-muted">
                  <th className="px-5 py-3 font-medium">Invoice</th>
                  <th className="px-3 py-3 font-medium">Client</th>
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 text-right font-medium">Total</th>
                  <th className="px-3 py-3 text-right font-medium">Paid</th>
                  <th className="px-5 py-3 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {invoices.map((i) => (
                  <tr key={i.id} className="transition hover:bg-cream/40">
                    <td className="px-5 py-3">
                      <Link href={`/invoices/${i.id}`} className="font-medium text-ink hover:text-orange-dark">
                        {i.number}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-ink-soft">{i.clientName}</td>
                    <td className="px-3 py-3 text-muted">{formatDate(i.issueDate)}</td>
                    <td className="px-3 py-3 text-right font-medium">{formatMoney(i.total)}</td>
                    <td className="px-3 py-3 text-right text-green-dark">{i.paid ? formatMoney(i.paid) : "—"}</td>
                    <td className="px-5 py-3 text-right">
                      <StatusBadge kind="invoice" value={i.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState compact icon={<Receipt />} title="No invoices yet" action={<Button asChild size="sm"><Link href="/invoices/new">Generate invoice</Link></Button>} />
        )}
      </Card>
    </div>
  );
}

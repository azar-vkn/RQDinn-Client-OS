import Link from "next/link";
import { CheckCircle2, Clock, FileSignature, Receipt } from "lucide-react";
import { requireClientPage } from "@/server/auth/session";
import { getPortalContext } from "@/server/services/portal";
import { getProjectBilling, listInvoices } from "@/server/services/billing";
import { listAgreements } from "@/server/services/agreements";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/misc";
import { EmptyState, PageHeader } from "@/components/shared/layout";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatMoney } from "@/lib/format";

export const metadata = { title: "Billing" };

export default async function PortalBilling() {
  const user = await requireClientPage();
  const ctx = await getPortalContext(user);
  if (!ctx.project) return <Card><EmptyState title="No project yet" /></Card>;
  const pid = ctx.project.project.id;
  const [billing, invoices, agreements] = await Promise.all([getProjectBilling(pid), listInvoices(user, { projectId: pid }), listAgreements({ projectId: pid })]);
  const visibleAgreements = agreements.filter((a) => a.status !== "draft");

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader title="Billing" description="Your payment schedule, invoices, receipts and agreement." />

      <Card className="p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-[13px] text-muted">Total</p>
            <p className="mt-1 font-serif text-3xl">{formatMoney(billing.scheduled)}</p>
          </div>
          <div>
            <p className="text-[13px] text-muted">Paid</p>
            <p className="mt-1 font-serif text-3xl text-green-dark">{formatMoney(billing.paid)}</p>
          </div>
          <div>
            <p className="text-[13px] text-muted">Pending</p>
            <p className="mt-1 font-serif text-3xl text-orange-dark">{formatMoney(billing.pending)}</p>
          </div>
        </div>
        {billing.scheduled > 0 && <Progress value={(billing.paid / billing.scheduled) * 100} tone="green" className="mt-5" />}
      </Card>

      <Card>
        <CardHeader title="Payment schedule" />
        {billing.milestones.length ? (
          <ul className="divide-y divide-line-soft">
            {billing.milestones.map(({ milestone: m }) => (
              <li key={m.id} className="flex items-center gap-3 px-5 py-4">
                {m.status === "paid" ? <CheckCircle2 className="size-5 text-green" /> : <Clock className="size-5 text-amber" />}
                <div className="flex-1">
                  <p className="text-sm font-medium">{m.label}</p>
                  <p className="text-xs text-muted">{m.status === "paid" ? `Paid on ${formatDate(m.paidAt)}` : m.dueDate ? `Due ${formatDate(m.dueDate)}` : "Pending"}</p>
                </div>
                <span className="font-semibold">{formatMoney(m.amount)}</span>
                <StatusBadge kind="milestone" value={m.status} className="hidden sm:inline-flex" />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState compact title="No payment schedule yet" />
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Invoices" icon={<Receipt />} />
          {invoices.length ? (
            <ul className="divide-y divide-line-soft">
              {invoices.map((i) => (
                <li key={i.id}>
                  <Link href={`/portal/invoices/${i.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-cream/40">
                    <div>
                      <p className="text-sm font-medium">{i.number}</p>
                      <p className="text-xs text-muted">{formatDate(i.issueDate)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{formatMoney(i.total)}</span>
                      <StatusBadge kind="invoice" value={i.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact title="No invoices yet" />
          )}
        </Card>
        <Card>
          <CardHeader title="Receipts" />
          {billing.payments.length ? (
            <ul className="divide-y divide-line-soft">
              {billing.payments.map(({ payment: p, milestoneLabel }) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-green-dark">{formatMoney(p.amount)}</p>
                    <p className="text-xs text-muted">
                      {formatDate(p.receivedAt)}
                      {milestoneLabel ? ` · ${milestoneLabel}` : ""}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" asChild>
                    <a href={`/api/pdf/receipt/${p.id}`}>Download</a>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact title="No payments yet" />
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Agreement" icon={<FileSignature />} />
        {visibleAgreements.length ? (
          <ul className="divide-y divide-line-soft">
            {visibleAgreements.map((a) => (
              <li key={a.id}>
                <Link href={`/portal/agreements/${a.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-cream/40">
                  <div>
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted">{a.acceptedAt ? `Accepted ${formatDate(a.acceptedAt)}` : "Awaiting your acceptance"}</p>
                  </div>
                  <StatusBadge kind="agreement" value={a.status} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState compact title="No agreement shared yet" />
        )}
      </Card>
      <p className="text-center text-xs text-muted">Online payments are coming soon. For now, please pay using the bank or UPI details on your invoice — we&apos;ll confirm here once received.</p>
    </div>
  );
}

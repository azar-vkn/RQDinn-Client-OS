import { notFound } from "next/navigation";
import { requireStaffPage } from "@/server/auth/session";
import { assertClientAccess } from "@/server/auth/permissions";
import { getInvoice } from "@/server/services/billing";
import { getProjectBilling } from "@/server/services/billing";
import { AppError } from "@/server/errors";
import { PageHeader } from "@/components/shared/layout";
import { InvoiceDocument } from "@/components/payments/invoice-document";
import { InvoiceActions } from "@/components/payments/invoice-actions";

export const metadata = { title: "Invoice" };

export default async function InvoicePage(props: PageProps<"/invoices/[id]">) {
  const user = await requireStaffPage();
  const { id } = await props.params;
  let inv;
  try {
    inv = await getInvoice(id);
    await assertClientAccess(user, inv.client.id);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }
  const billing = inv.invoice.projectId ? await getProjectBilling(inv.invoice.projectId) : null;
  const openMilestones = billing?.milestones.filter((m) => m.milestone.invoiceId === id && m.milestone.status !== "paid").map((m) => ({ ...m.milestone, invoiceNumber: m.invoiceNumber, received: m.received })) ?? [];

  return (
    <div className="animate-fade-in">
      <PageHeader
        className="no-print"
        breadcrumbs={[
          { label: inv.client.companyName, href: `/clients/${inv.client.id}` },
          ...(inv.invoice.projectId ? [{ label: inv.projectName ?? "Project", href: `/projects/${inv.invoice.projectId}?tab=payments` }] : []),
          { label: inv.invoice.number },
        ]}
        title={inv.invoice.number}
        actions={<InvoiceActions invoiceId={id} status={inv.invoice.status} sentAt={inv.invoice.sentAt} projectId={inv.invoice.projectId} balance={inv.balance} openMilestones={openMilestones} />}
      />
      <InvoiceDocument inv={inv} />
    </div>
  );
}

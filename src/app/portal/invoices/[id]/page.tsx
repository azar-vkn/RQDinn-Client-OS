import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { requireClientPage } from "@/server/auth/session";
import { getInvoice } from "@/server/services/billing";
import { AppError } from "@/server/errors";
import { Button } from "@/components/ui/button";
import { InvoiceDocument } from "@/components/payments/invoice-document";

export const metadata = { title: "Invoice" };

export default async function PortalInvoice(props: PageProps<"/portal/invoices/[id]">) {
  const user = await requireClientPage();
  const { id } = await props.params;
  let inv;
  try {
    inv = await getInvoice(id);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }
  if (inv.client.id !== user.clientId || inv.invoice.status === "draft" || inv.invoice.status === "void") notFound();
  return (
    <div className="animate-fade-in space-y-4">
      <div className="no-print flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/portal/billing">
            <ArrowLeft /> Billing
          </Link>
        </Button>
        <Button variant="secondary" size="sm" asChild>
          <a href={`/api/pdf/invoice/${id}`}>
            <Download /> Download PDF
          </a>
        </Button>
      </div>
      <InvoiceDocument inv={inv} />
    </div>
  );
}

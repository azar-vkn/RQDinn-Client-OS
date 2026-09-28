import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { requireClientPage } from "@/server/auth/session";
import { getAgreement } from "@/server/services/agreements";
import { AppError } from "@/server/errors";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AgreementPaper } from "@/components/documents/agreement-view";
import { AcceptAgreementForm } from "@/components/portal/accept-agreement";

export const metadata = { title: "Agreement" };

export default async function PortalAgreement(props: PageProps<"/portal/agreements/[id]">) {
  const user = await requireClientPage();
  const { id } = await props.params;
  let row;
  try {
    row = await getAgreement(id);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }
  const a = row.agreement;
  if (a.clientId !== user.clientId || a.status === "draft") notFound();
  return (
    <div className="animate-fade-in space-y-5">
      <div className="no-print flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/portal/billing">
            <ArrowLeft /> Billing
          </Link>
        </Button>
        <Button variant="secondary" size="sm" asChild>
          <a href={`/api/pdf/agreement/${id}`}>
            <Download /> Download PDF
          </a>
        </Button>
      </div>
      <AgreementPaper a={{ id: a.id, title: a.title, body: a.body, status: a.status, sentAt: a.sentAt, acceptedAt: a.acceptedAt, acceptedName: a.acceptedName, acceptedIp: a.acceptedIp, clientName: row.clientName }} />
      {a.status === "sent" && (
        <Card className="mx-auto max-w-3xl p-6">
          <h2 className="mb-4 font-serif text-xl font-medium">Accept this agreement</h2>
          <AcceptAgreementForm agreementId={id} defaultName={user.name} />
        </Card>
      )}
    </div>
  );
}

import { notFound } from "next/navigation";
import { requireStaffPage } from "@/server/auth/session";
import { assertProjectAccess } from "@/server/auth/permissions";
import { getAgreement } from "@/server/services/agreements";
import { AppError } from "@/server/errors";
import { PageHeader } from "@/components/shared/layout";
import { AgreementAdminView } from "@/components/documents/agreement-view";

export const metadata = { title: "Agreement" };

export default async function AgreementPage(props: PageProps<"/agreements/[id]">) {
  const user = await requireStaffPage();
  const { id } = await props.params;
  let row;
  try {
    row = await getAgreement(id);
    await assertProjectAccess(user, row.agreement.projectId);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }
  const a = row.agreement;
  return (
    <div className="animate-fade-in">
      <PageHeader
        className="no-print"
        breadcrumbs={[
          { label: row.clientName, href: `/clients/${a.clientId}` },
          { label: row.projectName, href: `/projects/${a.projectId}?tab=documents` },
          { label: "Agreement" },
        ]}
        title={a.title}
      />
      <AgreementAdminView
        a={{ id: a.id, title: a.title, body: a.body, status: a.status, sentAt: a.sentAt, acceptedAt: a.acceptedAt, acceptedName: a.acceptedName, acceptedIp: a.acceptedIp, clientName: row.clientName }}
      />
    </div>
  );
}

import { asc } from "drizzle-orm";
import { requireStaffPage } from "@/server/auth/session";
import { listClients } from "@/server/services/clients";
import { listProjects } from "@/server/services/projects";
import { getAgency, getSetting } from "@/server/services/settings";
import { db } from "@/server/db/client";
import { paymentMilestones } from "@/server/db/schema";
import { PageHeader } from "@/components/shared/layout";
import { InvoiceComposer } from "@/components/payments/invoice-composer";

export const metadata = { title: "New invoice" };

export default async function NewInvoicePage(props: PageProps<"/invoices/new">) {
  const user = await requireStaffPage();
  const sp = await props.searchParams;
  const [clients, projects, agency] = await Promise.all([listClients(user), listProjects(user), getAgency()]);
  const milestones = await db.select().from(paymentMilestones).orderBy(asc(paymentMilestones.position));
  const year = new Date().getFullYear();
  const seq = await getSetting<{ year: number; next: number }>("invoice_sequence", { year, next: 1 });
  const previewNumber = `${agency.invoicePrefix}-${year}-${String(seq.year === year ? seq.next : 1).padStart(3, "0")}`;

  return (
    <div className="animate-fade-in">
      <PageHeader breadcrumbs={[{ label: "Payments", href: "/payments" }, { label: "New invoice" }]} title="Generate invoice" description="Invoices are stored in the database and can be downloaded as PDF." />
      <InvoiceComposer
        clients={clients.map((c) => ({ id: c.id, companyName: c.companyName }))}
        projects={projects.map((p) => ({
          id: p.id,
          name: p.name,
          clientId: p.clientId,
          value: p.value,
          annualValue: p.annualValue,
          milestones: milestones.filter((m) => m.projectId === p.id).map((m) => ({ id: m.id, label: m.label, amount: m.amount, status: m.status, invoiceId: m.invoiceId })),
        }))}
        defaultClientId={typeof sp.clientId === "string" ? sp.clientId : undefined}
        defaultProjectId={typeof sp.projectId === "string" ? sp.projectId : undefined}
        defaultNotes={agency.invoiceNotes}
        previewNumber={previewNumber}
      />
    </div>
  );
}

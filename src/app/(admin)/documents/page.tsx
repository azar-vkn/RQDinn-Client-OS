import { requireStaffPage } from "@/server/auth/session";
import { listDocuments } from "@/server/services/documents";
import { PageHeader } from "@/components/shared/layout";
import { FilterBar } from "@/components/shared/filter-bar";
import { Card } from "@/components/ui/card";
import { DocumentsTable } from "@/components/documents/documents-table";
import { DOCUMENT_TYPES } from "@/lib/constants";

export const metadata = { title: "Documents" };

export default async function DocumentsPage(props: PageProps<"/documents">) {
  const user = await requireStaffPage();
  const sp = await props.searchParams;
  const type = typeof sp.type === "string" ? sp.type : undefined;
  const q = typeof sp.q === "string" ? sp.q.toLowerCase() : "";
  let docs = await listDocuments(user);
  if (type) docs = docs.filter((d) => d.kind === type);
  if (q) docs = docs.filter((d) => `${d.name} ${d.clientName} ${d.projectName ?? ""}`.toLowerCase().includes(q));

  return (
    <div className="animate-fade-in">
      <PageHeader title="Documents" description="Agreements, invoices, receipts, proposals and briefs — for every client." />
      <FilterBar placeholder="Search documents…" filters={[{ name: "type", label: "All types", options: DOCUMENT_TYPES }]} />
      <Card>
        <DocumentsTable docs={docs} empty={q || type ? "No documents match your filters." : "No documents yet."} />
      </Card>
    </div>
  );
}

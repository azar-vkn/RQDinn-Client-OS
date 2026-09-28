import Link from "next/link";
import { Download, FileSignature, FileText, Receipt, ScrollText } from "lucide-react";
import type { DocumentRow } from "@/server/services/documents";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/layout";
import { Button } from "@/components/ui/button";
import { DOCUMENT_TYPES, labelFor } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/format";

const ICON = { agreement: FileSignature, invoice: FileText, receipt: Receipt, proposal: ScrollText, brief: ScrollText, other: FileText };

export function DocumentsTable({ docs, showClient = true, empty = "No documents yet." }: { docs: DocumentRow[]; showClient?: boolean; empty?: string }) {
  if (!docs.length) return <EmptyState compact icon={<FileText />} title={empty} description="Agreements, invoices, receipts and uploaded documents appear here." />;
  return (
    <ul className="divide-y divide-line-soft">
      {docs.map((d) => {
        const Icon = ICON[d.kind] ?? FileText;
        return (
          <li key={`${d.kind}-${d.id}`} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-cream/40">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cream text-muted">
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <Link href={d.href} className="block truncate text-sm font-medium text-ink hover:text-orange-dark" target={d.href.startsWith("/api") ? "_blank" : undefined}>
                {d.name}
              </Link>
              <p className="truncate text-xs text-muted">
                {labelFor(DOCUMENT_TYPES, d.kind)} · {formatDate(d.date)}
                {showClient ? ` · ${d.clientName}` : d.projectName ? ` · ${d.projectName}` : ""}
                {d.amount ? ` · ${formatMoney(d.amount)}` : ""}
              </p>
            </div>
            <StatusBadge kind="document" value={d.status} className="hidden sm:inline-flex" />
            <Button variant="ghost" size="sm" asChild>
              <Link href={d.href} target={d.href.startsWith("/api") ? "_blank" : undefined}>
                View
              </Link>
            </Button>
            {d.downloadHref && (
              <Button variant="ghost" size="icon-sm" asChild>
                <a href={d.downloadHref} aria-label={`Download ${d.name}`}>
                  <Download />
                </a>
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

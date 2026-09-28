import Link from "next/link";
import { Building2, Phone } from "lucide-react";
import { requireStaffPage } from "@/server/auth/session";
import { listClients } from "@/server/services/clients";
import { listStaff } from "@/server/services/projects";
import { PageHeader, EmptyState } from "@/components/shared/layout";
import { FilterBar } from "@/components/shared/filter-bar";
import { NewClientButton } from "@/components/clients/client-dialog";
import { StatusBadge, DemoBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/misc";
import { CLIENT_STATUS_LABEL, CLIENT_STATUSES, INDUSTRIES, labelFor } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/format";

export const metadata = { title: "Clients" };

export default async function ClientsPage(props: PageProps<"/clients">) {
  const user = await requireStaffPage();
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const [clients, staff] = await Promise.all([listClients(user, { q, status }), listStaff()]);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Clients" description="Every business RQdinn works with — from first conversation to long-term maintenance." actions={<NewClientButton staff={staff} />} />
      <FilterBar placeholder="Search by company, contact, phone…" filters={[{ name: "status", label: "All statuses", options: CLIENT_STATUSES.map((s) => ({ value: s, label: CLIENT_STATUS_LABEL[s] })) }]} />

      {clients.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Building2 />}
            title={q || status ? "No clients match your filters" : "No clients yet"}
            description={q || status ? "Try a different search or clear the filters." : "Add your first client to start their journey with RQdinn."}
          />
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line-soft text-left text-xs font-medium text-muted">
                  <th className="px-5 py-3 font-medium">Company</th>
                  <th className="px-3 py-3 font-medium">Contact</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Projects</th>
                  <th className="px-3 py-3 font-medium">Value</th>
                  <th className="px-3 py-3 font-medium">Owner</th>
                  <th className="px-5 py-3 text-right font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {clients.map((c) => (
                  <tr key={c.id} className="group transition hover:bg-cream/50">
                    <td className="px-5 py-3.5">
                      <Link href={`/clients/${c.id}`} className="flex items-center gap-3">
                        <Avatar name={c.companyName} />
                        <span className="min-w-0">
                          <span className="flex items-center gap-2 font-medium text-ink group-hover:text-orange-dark">
                            {c.companyName} {c.isDemo && <DemoBadge />}
                          </span>
                          <span className="block text-xs text-muted">
                            {labelFor(INDUSTRIES, c.industry)}
                            {c.city ? ` · ${c.city}` : ""}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="text-ink">{c.contactName ?? "—"}</div>
                      <div className="text-xs text-muted">{c.contactPhone ?? c.contactEmail ?? ""}</div>
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusBadge kind="client" value={c.status} />
                    </td>
                    <td className="px-3 py-3.5 text-ink-soft">{c.projectCount}</td>
                    <td className="px-3 py-3.5 text-ink-soft">{c.totalValue ? formatMoney(c.totalValue) : "—"}</td>
                    <td className="px-3 py-3.5 text-ink-soft">{c.assigneeName ?? "—"}</td>
                    <td className="px-5 py-3.5 text-right text-muted">{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {clients.map((c) => (
              <Link key={c.id} href={`/clients/${c.id}`}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={c.companyName} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{c.companyName}</p>
                        <p className="truncate text-xs text-muted">{c.contactName}</p>
                      </div>
                    </div>
                    <StatusBadge kind="client" value={c.status} />
                  </div>
                  {c.contactPhone && (
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
                      <Phone className="size-3.5" /> {c.contactPhone}
                    </p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

import { Wrench } from "lucide-react";
import { requireClientPage } from "@/server/auth/session";
import { getPortalContext } from "@/server/services/portal";
import { listMaintenance } from "@/server/services/maintenance";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/shared/layout";
import { StatusBadge } from "@/components/shared/status-badge";
import { MaintenanceRequestForm } from "@/components/portal/maintenance-request-form";
import { MAINTENANCE_TYPES, labelFor } from "@/lib/constants";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Updates" };

export default async function PortalMaintenance() {
  const user = await requireClientPage();
  const ctx = await getPortalContext(user);
  if (!ctx.project) return <Card><EmptyState title="No project yet" /></Card>;
  const live = ctx.project.project.phase === "live" || ctx.project.project.phase === "maintenance";
  const requests = await listMaintenance(user, { projectId: ctx.project.project.id });

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader title="Request an update" description="Need a change on your live website? Send it here and track its progress." />
      {live ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
          <Card className="p-5 sm:p-6">
            <MaintenanceRequestForm projectId={ctx.project.project.id} />
          </Card>
          <Card>
            <CardHeader title="Your requests" />
            {requests.length ? (
              <ul className="divide-y divide-line-soft">
                {requests.map((r) => (
                  <li key={r.id} className="space-y-2 px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{r.title}</p>
                        <p className="text-xs text-muted">
                          {labelFor(MAINTENANCE_TYPES, r.type)} · {formatDate(r.createdAt)}
                        </p>
                      </div>
                      <StatusBadge kind="maintenance" value={r.status} />
                    </div>
                    {r.response && (
                      <p className="rounded-lg border border-green/25 bg-green-soft p-3 text-sm">
                        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-green-dark">RQdinn</span>
                        {r.response}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact icon={<Wrench />} title="No maintenance requests yet." description="Your update requests will appear here." />
            )}
          </Card>
        </div>
      ) : (
        <Card>
          <EmptyState icon={<Wrench />} title="Available after launch" description="Once your website is live, you can request updates here anytime. Need something now? Use Contact RQdinn." />
        </Card>
      )}
    </div>
  );
}

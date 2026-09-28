import { requireStaffPage } from "@/server/auth/session";
import { listMaintenance } from "@/server/services/maintenance";
import { listProjects, listStaff } from "@/server/services/projects";
import { listFiles } from "@/server/services/files";
import { PageHeader } from "@/components/shared/layout";
import { FilterBar } from "@/components/shared/filter-bar";
import { Card } from "@/components/ui/card";
import { MaintenanceTable, NewMaintenanceDialog } from "@/components/maintenance/maintenance-table";
import { MAINTENANCE_STATUS_LABEL } from "@/lib/constants";

export const metadata = { title: "Maintenance" };

export default async function MaintenancePage(props: PageProps<"/maintenance">) {
  const user = await requireStaffPage();
  const sp = await props.searchParams;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const q = typeof sp.q === "string" ? sp.q.toLowerCase() : "";
  const [items, projects, staff] = await Promise.all([listMaintenance(user, { status }), listProjects(user), listStaff()]);
  const clientIds = [...new Set(items.map((i) => i.clientId))];
  const files = (await Promise.all(clientIds.map((clientId) => listFiles({ clientId })))).flat();
  const filtered = (q ? items.filter((m) => `${m.title} ${m.clientName} ${m.description}`.toLowerCase().includes(q)) : items).map((m) => ({
    ...m,
    files: files.filter((f) => f.maintenanceRequestId === m.id),
  }));
  const live = projects.filter((p) => p.phase === "live" || p.phase === "maintenance");

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Maintenance"
        description="Update requests from live clients."
        actions={live.length ? <NewMaintenanceDialog projects={live.map((p) => ({ id: p.id, name: `${p.clientName} — ${p.name}` }))} /> : undefined}
      />
      <FilterBar placeholder="Search requests…" filters={[{ name: "status", label: "All statuses", options: Object.entries(MAINTENANCE_STATUS_LABEL).map(([value, label]) => ({ value, label })) }]} />
      <Card>
        <MaintenanceTable items={filtered} staff={staff} />
      </Card>
    </div>
  );
}

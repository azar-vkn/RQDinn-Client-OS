import Link from "next/link";
import { FolderKanban, LayoutGrid, List } from "lucide-react";
import { requireStaffPage } from "@/server/auth/session";
import { listProjects, listStaff } from "@/server/services/projects";
import { listClients } from "@/server/services/clients";
import { workflowsWithSteps } from "@/server/services/workflows";
import { PageHeader, EmptyState } from "@/components/shared/layout";
import { FilterBar } from "@/components/shared/filter-bar";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { PipelineBoard } from "@/components/projects/pipeline-board";
import { StageBadge, StatusBadge, DemoBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import { Progress, Avatar } from "@/components/ui/misc";
import { PIPELINE_LABEL, PIPELINE_STAGES } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Projects" };

export default async function ProjectsPage(props: PageProps<"/projects">) {
  const user = await requireStaffPage();
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const stage = typeof sp.stage === "string" ? sp.stage : undefined;
  const view = sp.view === "board" ? "board" : "list";
  const [projects, clients, workflows, staff] = await Promise.all([listProjects(user, { q, stage }), listClients(user), workflowsWithSteps(), listStaff()]);

  const viewHref = (v: string) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (stage) next.set("stage", stage);
    if (v === "board") next.set("view", "board");
    return `/projects${next.toString() ? `?${next}` : ""}`;
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Projects"
        description="Every build in flight — and everything live."
        actions={<NewProjectDialog clients={clients.map((c) => ({ id: c.id, companyName: c.companyName }))} workflows={workflows} staff={staff} />}
      />
      <FilterBar placeholder="Search projects or clients…" filters={[{ name: "stage", label: "All stages", options: PIPELINE_STAGES.map((s) => ({ value: s, label: PIPELINE_LABEL[s] })) }]}>
        <div className="flex rounded-lg border border-line bg-white p-0.5 shadow-card">
          {[
            { v: "list", icon: List, label: "List" },
            { v: "board", icon: LayoutGrid, label: "Board" },
          ].map((o) => (
            <Link key={o.v} href={viewHref(o.v)} className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium", view === o.v ? "bg-cream-dark text-ink" : "text-muted hover:text-ink")}>
              <o.icon className="size-3.5" /> {o.label}
            </Link>
          ))}
        </div>
      </FilterBar>

      {projects.length === 0 ? (
        <Card>
          <EmptyState icon={<FolderKanban />} title={q || stage ? "No projects match" : "No projects yet"} description={q || stage ? "Try a different search or stage." : "Create a project for a client to start its workflow."} />
        </Card>
      ) : view === "board" ? (
        <PipelineBoard columns={PIPELINE_STAGES.map((s) => ({ stage: s, projects: projects.filter((p) => p.stage === s) }))} />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line-soft">
            {projects.map((p) => (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`} className="grid gap-3 px-5 py-4 transition hover:bg-cream/40 md:grid-cols-[2fr_1.2fr_1.3fr_1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate font-medium text-ink">
                      {p.name} {p.isDemo && <DemoBadge />}
                    </p>
                    <p className="truncate text-xs text-muted">{p.clientName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StageBadge stage={p.stage} />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-muted">
                      <span className="truncate">{p.phase === "maintenance" ? "Maintenance" : p.stepName}</span>
                      <span>{p.progress}%</span>
                    </div>
                    <Progress value={p.progress} size="sm" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-ink">{formatMoney(p.value + p.annualValue)}</p>
                    <StatusBadge kind="payment" value={p.paymentStatus} className="mt-0.5" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted md:justify-end">
                    <Avatar name={p.assigneeName ?? "Unassigned"} size="sm" />
                    <span className="md:hidden">{p.assigneeName ?? "Unassigned"}</span>
                    {p.dueDate && <span className="hidden lg:inline">{formatDate(p.dueDate, "d MMM")}</span>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

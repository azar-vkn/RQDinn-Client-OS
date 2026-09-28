import { notFound } from "next/navigation";
import { requireStaffPage } from "@/server/auth/session";
import { getWorkflow, workflowInUse } from "@/server/services/workflows";
import { AppError } from "@/server/errors";
import { PageHeader } from "@/components/shared/layout";
import { WorkflowEditor } from "@/components/workflows/workflow-editor";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PIPELINE_LABEL, SERVICE_TYPES, labelFor } from "@/lib/constants";

export const metadata = { title: "Workflow" };

export default async function WorkflowPage(props: PageProps<"/workflows/[id]">) {
  const user = await requireStaffPage();
  const { id } = await props.params;
  const isNew = id === "new";
  let wf = null;
  if (!isNew) {
    try {
      wf = await getWorkflow(id);
    } catch (e) {
      if (e instanceof AppError) notFound();
      throw e;
    }
  }
  if (isNew && user.role !== "admin") notFound();

  const initial = wf
    ? {
        name: wf.name,
        description: wf.description,
        serviceType: wf.serviceType,
        steps: wf.steps.map((s) => ({ name: s.name, key: s.key, pipelineStage: s.pipelineStage, clientVisible: s.clientVisible, clientLabel: s.clientLabel ?? "" })),
      }
    : { name: "", description: null, serviceType: "website", steps: [] };

  return (
    <div className="animate-fade-in">
      <PageHeader breadcrumbs={[{ label: "Workflows", href: "/workflows" }, { label: wf?.name ?? "New workflow" }]} title={wf?.name ?? "New workflow"} description={wf ? labelFor(SERVICE_TYPES, wf.serviceType) : "Design a reusable delivery playbook."} />
      {user.role === "admin" ? (
        <WorkflowEditor id={wf?.id ?? null} initial={initial} inUse={wf ? await workflowInUse(wf.id) : false} />
      ) : (
        <Card>
          <ol className="divide-y divide-line-soft">
            {wf!.steps.map((s, i) => (
              <li key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="flex size-7 items-center justify-center rounded-full bg-cream-dark text-xs font-semibold">{i + 1}</span>
                <span className="flex-1 text-sm">{s.name}</span>
                <Badge tone="outline">{PIPELINE_LABEL[s.pipelineStage]}</Badge>
              </li>
            ))}
          </ol>
          <p className="border-t border-line-soft px-5 py-3 text-xs text-muted">Only admins can edit workflows.</p>
        </Card>
      )}
    </div>
  );
}

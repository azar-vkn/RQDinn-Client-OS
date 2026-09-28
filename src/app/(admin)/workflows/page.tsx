import Link from "next/link";
import { ChevronRight, GitBranch, Plus } from "lucide-react";
import { requireStaffPage } from "@/server/auth/session";
import { workflowsWithSteps } from "@/server/services/workflows";
import { listWorkflows } from "@/server/services/workflows";
import { PageHeader } from "@/components/shared/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SERVICE_TYPES, labelFor } from "@/lib/constants";

export const metadata = { title: "Workflows" };

export default async function WorkflowsPage() {
  const user = await requireStaffPage();
  const [wfs, counts] = await Promise.all([workflowsWithSteps(), listWorkflows()]);
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Workflows"
        description="Reusable delivery playbooks. Every project copies its workflow's steps when it's created."
        actions={
          user.role === "admin" ? (
            <Button asChild>
              <Link href="/workflows/new">
                <Plus /> New workflow
              </Link>
            </Button>
          ) : undefined
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {wfs.map((w) => {
          const c = counts.find((x) => x.workflow.id === w.id);
          return (
            <Link key={w.id} href={`/workflows/${w.id}`} className="group">
              <Card className="h-full p-5 transition group-hover:shadow-lift">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-orange-soft text-orange-dark">
                      <GitBranch className="size-5" />
                    </span>
                    <div>
                      <p className="font-medium text-ink group-hover:text-orange-dark">{w.name}</p>
                      <p className="text-xs text-muted">
                        {labelFor(SERVICE_TYPES, w.serviceType)} · {w.steps.length} steps · {c?.projectCount ?? 0} projects
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-subtle" />
                </div>
                {w.description && <p className="mt-3 text-sm text-muted">{w.description}</p>}
                <div className="mt-4 flex flex-wrap items-center gap-1">
                  {w.steps.map((s, i) => (
                    <span key={s.id} className="flex items-center gap-1">
                      <Badge tone={s.key === "custom" ? "outline" : "neutral"} className="font-normal">
                        {s.name}
                      </Badge>
                      {i < w.steps.length - 1 && <span className="text-subtle">›</span>}
                    </span>
                  ))}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

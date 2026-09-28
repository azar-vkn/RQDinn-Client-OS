import { Mail, Phone } from "lucide-react";
import { requireClientPage } from "@/server/auth/session";
import { getPortalContext } from "@/server/services/portal";
import { listActivity } from "@/server/services/activity";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar, Progress } from "@/components/ui/misc";
import { EmptyState, InfoRow, PageHeader } from "@/components/shared/layout";
import { Timeline } from "@/components/shared/timeline";
import { Roadmap, clientRoadmap } from "@/components/portal/roadmap";
import { SERVICE_TYPES, labelFor } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Your project" };

export default async function PortalProject() {
  const user = await requireClientPage();
  const ctx = await getPortalContext(user);
  const p = ctx.project;
  if (!p) return <Card><EmptyState title="No project yet" /></Card>;
  const updates = await listActivity({ projectId: p.project.id, clientVisibleOnly: true });

  return (
    <div className="animate-fade-in">
      <PageHeader eyebrow={ctx.client.companyName} title={p.project.name} description={labelFor(SERVICE_TYPES, p.project.serviceType)} />
      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Progress" description={`${p.project.progress}% complete`} />
            <div className="space-y-5 p-5">
              <Progress value={p.project.progress} size="lg" />
              <Roadmap steps={clientRoadmap(p.steps, p.project.currentStepId, p.project.phase)} withDates />
            </div>
          </Card>
          <Card>
            <CardHeader title="Project information" />
            <dl className="divide-y divide-line-soft px-5 py-2">
              <InfoRow label="Project value">{formatMoney(p.project.value)}</InfoRow>
              <InfoRow label="Annual plan">{formatMoney(p.project.annualValue)} / year</InfoRow>
              <InfoRow label="Started">{formatDate(p.project.startDate)}</InfoRow>
              <InfoRow label="Target launch">{formatDate(p.project.dueDate)}</InfoRow>
              {p.launch && <InfoRow label="Launched">{formatDate(p.launch.launchedAt)}</InfoRow>}
              {p.launch && <InfoRow label="Hosting renewal">{formatDate(p.launch.hostingRenewalDate)}</InfoRow>}
            </dl>
          </Card>
          {ctx.pm && (
            <Card className="p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Your project manager</p>
              <div className="flex items-center gap-3">
                <Avatar name={ctx.pm.name} size="lg" />
                <div>
                  <p className="font-medium">{ctx.pm.name}</p>
                  <p className="text-sm text-muted">{ctx.pm.title ?? "RQdinn"}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" asChild>
                  <a href={`mailto:${ctx.pm.email}`}>
                    <Mail /> Email
                  </a>
                </Button>
                {ctx.pm.phone && (
                  <Button size="sm" variant="secondary" asChild>
                    <a href={`tel:${ctx.pm.phone}`}>
                      <Phone /> Call
                    </a>
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>
        <Card className="p-6">
          <h2 className="mb-5 text-[15px] font-semibold">Timeline</h2>
          {updates.length ? <Timeline items={updates} showActor={false} /> : <EmptyState compact title="No updates yet" />}
        </Card>
      </div>
    </div>
  );
}

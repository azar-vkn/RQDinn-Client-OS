import Link from "next/link";
import { CalendarClock, ClipboardList, Phone, Video } from "lucide-react";
import { requireStaffPage } from "@/server/auth/session";
import { listOnboardingForms } from "@/server/services/onboarding";
import { PageHeader, EmptyState, SectionTitle } from "@/components/shared/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/misc";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Onboarding" };

export default async function OnboardingHubPage() {
  const user = await requireStaffPage();
  const forms = (await listOnboardingForms(user)).filter((f) => f.phase !== "cancelled");
  const active = forms.filter((f) => f.status !== "completed").sort((a, b) => (a.onboardingAt?.getTime() ?? Infinity) - (b.onboardingAt?.getTime() ?? Infinity));
  const done = forms.filter((f) => f.status === "completed").sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0));

  const card = (f: (typeof forms)[number]) => (
    <Card key={f.projectId} className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted">{f.clientName}</p>
          <p className="truncate font-medium">{f.projectName}</p>
        </div>
        <StatusBadge kind="onboarding" value={f.status} />
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
        <CalendarClock className="size-3.5" />
        {f.status === "completed" ? `Completed ${formatDateTime(f.completedAt)}` : f.onboardingAt ? formatDateTime(f.onboardingAt) : "Call not scheduled"}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <Progress value={f.progress} className="flex-1" />
        <span className="text-xs font-medium">{f.progress}%</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {f.status !== "completed" && (
          <Button size="sm" asChild>
            <Link href={`/call/${f.projectId}`}>
              <Phone /> Start call
            </Link>
          </Button>
        )}
        <Button size="sm" variant="secondary" asChild>
          <Link href={`/projects/${f.projectId}/onboarding`}>{f.status === "completed" ? "View answers" : "Open form"}</Link>
        </Button>
        {f.meetingLink && f.status !== "completed" && (
          <Button size="icon-sm" variant="ghost" asChild>
            <a href={f.meetingLink} target="_blank" rel="noreferrer" aria-label="Join meeting">
              <Video />
            </a>
          </Button>
        )}
      </div>
    </Card>
  );

  return (
    <div className="animate-fade-in">
      <PageHeader title="Onboarding" description="Run onboarding calls and capture every detail straight into the project record." />
      <SectionTitle>In progress</SectionTitle>
      {active.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{active.map(card)}</div>
      ) : (
        <Card>
          <EmptyState compact icon={<ClipboardList />} title="No onboarding in progress" description="Onboarding starts automatically once a project is created." />
        </Card>
      )}
      {done.length > 0 && (
        <>
          <SectionTitle className="mt-8">Completed</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{done.map(card)}</div>
        </>
      )}
    </div>
  );
}

import Link from "next/link";
import { ArrowRight, Building2, CalendarClock, CheckSquare, CircleDollarSign, FolderKanban, Rocket, Video } from "lucide-react";
import { requireStaffPage } from "@/server/auth/session";
import { getDashboard } from "@/server/services/dashboard";
import { PageHeader, StatCard, EmptyState, SectionTitle } from "@/components/shared/layout";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PipelineBoard } from "@/components/projects/pipeline-board";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatDateTime, formatMoney, timeAgo } from "@/lib/format";

export const metadata = { title: "Dashboard" };

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function DashboardPage() {
  const user = await requireStaffPage();
  const d = await getDashboard(user);
  const firstName = user.role === "admin" ? "RQdinn" : user.name.split(" ")[0];

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow={formatDate(new Date(), "EEEE, d MMMM")}
        title={`${greeting()}, ${firstName}`}
        description="Here's what's happening across your projects."
        actions={
          <Button variant="secondary" asChild>
            <Link href="/projects">
              All projects <ArrowRight />
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Active Clients" value={d.stats.activeClients} icon={<Building2 />} href="/clients?status=active" />
        <StatCard label="Active Projects" value={d.stats.activeProjects} icon={<FolderKanban />} tone="orange" href="/projects" />
        <StatCard label="Pending Payments" value={formatMoney(d.stats.pendingPayments)} icon={<CircleDollarSign />} href="/payments" />
        <StatCard label="Launching Soon" value={d.stats.launchingSoon} icon={<Rocket />} tone="green" hint="Approved or in final stages" href="/projects?stage=ready_to_launch" />
      </div>

      <section className="mt-10">
        <SectionTitle
          action={
            <Link href="/projects?view=board" className="text-[13px] font-medium text-muted hover:text-ink">
              Open board →
            </Link>
          }
        >
          Project Pipeline
        </SectionTitle>
        <PipelineBoard columns={d.pipeline} />
      </section>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="My tasks" icon={<CheckSquare />} action={<Link href="/tasks?mine=1" className="text-xs font-medium text-muted hover:text-ink">View all</Link>} />
          {d.myTasks.length ? (
            <ul className="divide-y divide-line-soft">
              {d.myTasks.map((t) => (
                <li key={t.id}>
                  <Link href={`/projects/${t.projectId}?tab=tasks`} className="flex items-start justify-between gap-3 px-5 py-3 transition hover:bg-cream/60">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink">{t.title}</p>
                      <p className="truncate text-xs text-muted">{t.clientName} · {t.projectName}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <StatusBadge kind="task" value={t.status} />
                      {t.dueDate && <span className="text-[11px] text-subtle">{formatDate(t.dueDate, "d MMM")}</span>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact icon={<CheckSquare />} title="No open tasks" description="Tasks assigned to you will appear here." />
          )}
        </Card>

        <Card>
          <CardHeader title="Onboarding calls" icon={<CalendarClock />} action={<Link href="/onboarding" className="text-xs font-medium text-muted hover:text-ink">Onboarding hub</Link>} />
          {d.upcomingCalls.length ? (
            <ul className="divide-y divide-line-soft">
              {d.upcomingCalls.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{c.clientName}</p>
                    <p className="text-xs text-muted">{formatDateTime(c.at)}</p>
                  </div>
                  <div className="flex gap-1.5">
                    {c.link && (
                      <Button size="icon-sm" variant="secondary" asChild>
                        <a href={c.link} target="_blank" rel="noreferrer" aria-label="Join meeting">
                          <Video />
                        </a>
                      </Button>
                    )}
                    <Button size="sm" asChild>
                      <Link href={`/call/${c.id}`}>Start call</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact icon={<CalendarClock />} title="No calls scheduled" description="Schedule an onboarding call from a project's Onboarding tab." />
          )}
        </Card>

        <Card>
          <CardHeader title="Recent activity" />
          {d.activity.length ? (
            <ul className="space-y-0.5 px-2 py-2">
              {d.activity.map((a) => (
                <li key={a.id}>
                  <Link href={a.projectId ? `/projects/${a.projectId}?tab=activity` : "#"} className="block rounded-lg px-3 py-2 transition hover:bg-cream/60">
                    <p className="text-sm text-ink">{a.description}</p>
                    <p className="text-xs text-muted">
                      {a.clientName} · {timeAgo(a.createdAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact title="No activity yet" />
          )}
        </Card>
      </div>
    </div>
  );
}

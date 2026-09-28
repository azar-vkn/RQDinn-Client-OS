import Link from "next/link";
import { ArrowRight, BellRing, CreditCard, ExternalLink, FileSignature, FolderUp, LayoutList, MessageCircle, MonitorCheck, PartyPopper, Receipt, Wrench, ClipboardList } from "lucide-react";
import { requireClientPage } from "@/server/auth/session";
import { getPortalContext } from "@/server/services/portal";
import { listActivity } from "@/server/services/activity";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/layout";
import { Roadmap, clientRoadmap } from "@/components/portal/roadmap";
import { formatDate, timeAgo } from "@/lib/format";

export const metadata = { title: "Welcome" };

const ATTENTION_ICON: Record<string, React.ElementType> = { agreement: FileSignature, preview: MonitorCheck, invoice: Receipt, onboarding: ClipboardList };

export default async function PortalHome() {
  const user = await requireClientPage();
  const ctx = await getPortalContext(user);
  const p = ctx.project;

  if (!p) {
    return (
      <Card>
        <EmptyState title={`Welcome, ${ctx.client.companyName}`} description="Your project will appear here as soon as the RQdinn team sets it up." />
      </Card>
    );
  }

  const phase = p.project.phase;
  const statusLabel = phase === "maintenance" ? "In maintenance" : phase === "live" ? "Live" : (p.steps.find((s) => s.id === p.project.currentStepId)?.clientLabel || p.current?.name || "In progress");
  const roadmap = clientRoadmap(p.steps, p.project.currentStepId, phase);
  const updates = await listActivity({ projectId: p.project.id, clientVisibleOnly: true, limit: 6 });
  const firstName = user.name.split(" ")[0];
  const live = phase === "live" || phase === "maintenance";

  const actions = [
    { label: "View Project", href: "/portal/project", icon: LayoutList },
    { label: "Upload Files", href: "/portal/files", icon: FolderUp },
    { label: "Review Website", href: "/portal/review", icon: MonitorCheck },
    { label: "View Invoice", href: "/portal/billing", icon: CreditCard },
    { label: "Request an Update", href: "/portal/maintenance", icon: Wrench },
    { label: "Contact RQdinn", href: "/portal/contact", icon: MessageCircle },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative overflow-hidden rounded-3xl bg-ink p-6 text-cream sm:p-9">
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-orange/25 blur-3xl" />
        <div className="absolute -bottom-28 left-10 size-64 rounded-full bg-green/20 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-light">{ctx.client.companyName}</p>
          <h1 className="mt-2 font-serif text-3xl font-light sm:text-[40px]">Welcome back, {firstName}.</h1>
          <p className="mt-4 text-sm text-cream/70">Your {p.project.name.toLowerCase().includes("website") ? "website project" : "project"} is currently:</p>
          <p className={`mt-1 text-2xl font-semibold uppercase tracking-[0.08em] ${live ? "text-green-light" : "text-white"}`}>{live && "🎉 "}{statusLabel}</p>
          <div className="mt-5 max-w-md">
            <div className="mb-1.5 flex justify-between text-xs text-cream/70">
              <span>Progress</span>
              <span className="font-semibold text-cream">{p.project.progress}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/15">
              <div className={`h-full rounded-full ${live ? "bg-green" : "bg-orange"} transition-all duration-700`} style={{ width: `${p.project.progress}%` }} />
            </div>
          </div>
          {p.launch && (
            <a href={p.launch.url} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/15">
              <PartyPopper className="size-4" /> {p.launch.url.replace(/^https?:\/\//, "")} <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
      </section>

      {ctx.attention.length > 0 && (
        <section className="space-y-2">
          {ctx.attention.map((a) => {
            const Icon = ATTENTION_ICON[a.kind] ?? BellRing;
            return (
              <Link key={a.href} href={a.href} className="group flex items-center gap-4 rounded-2xl border border-orange/25 bg-orange-soft/60 p-4 transition hover:bg-orange-soft">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange text-white">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{a.title}</p>
                  <p className="text-sm text-muted">{a.description}</p>
                </div>
                <ArrowRight className="size-4 text-orange-dark transition group-hover:translate-x-0.5" />
              </Link>
            );
          })}
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <Card>
          <CardHeader title="Roadmap" description={p.project.dueDate && !live ? `Target launch: ${formatDate(p.project.dueDate)}` : undefined} />
          <div className="p-5">
            <Roadmap steps={roadmap} />
          </div>
        </Card>
        <div className="space-y-5">
          <div>
            <h2 className="mb-3 text-[15px] font-semibold">Quick actions</h2>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {actions.map((a) => (
                <Link key={a.href} href={a.href} className="group flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-cream text-ink-soft transition group-hover:bg-orange-soft group-hover:text-orange-dark">
                    <a.icon className="size-4.5" />
                  </span>
                  <span className="text-sm font-medium text-ink">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>
          <Card>
            <CardHeader title="Latest updates" />
            {updates.length ? (
              <ul className="divide-y divide-line-soft">
                {updates.map((u) => (
                  <li key={u.id} className="px-5 py-3">
                    <p className="text-sm text-ink">{u.description}</p>
                    <p className="text-xs text-muted">{timeAgo(u.createdAt)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact title="No updates yet" />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

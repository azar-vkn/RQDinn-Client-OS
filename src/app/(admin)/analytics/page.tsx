import { BarChart3, CheckSquare, CircleDollarSign, Repeat, Wallet } from "lucide-react";
import { requireStaffPage } from "@/server/auth/session";
import { getAnalytics } from "@/server/services/dashboard";
import { PageHeader, StatCard } from "@/components/shared/layout";
import { Card, CardHeader } from "@/components/ui/card";
import { PIPELINE_LABEL, SERVICE_TYPES, labelFor } from "@/lib/constants";
import { formatMoney } from "@/lib/format";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const user = await requireStaffPage();
  const a = await getAnalytics(user);
  const maxMonth = Math.max(1, ...a.months.map((m) => m.total));
  const maxStage = Math.max(1, ...a.byStage.map((s) => s.count));
  const maxService = Math.max(1, ...a.byService.map((s) => s.value));
  const collectionRate = a.contracted ? Math.round((a.collected / a.contracted) * 100) : 0;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Analytics" description="How the agency is doing — revenue, pipeline and recurring income." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Contracted" value={formatMoney(a.contracted)} icon={<Wallet />} hint={`${a.projectCount} projects`} />
        <StatCard label="Collected" value={formatMoney(a.collected)} icon={<CircleDollarSign />} tone="green" hint={`${collectionRate}% collection rate`} />
        <StatCard label="Annual recurring" value={formatMoney(a.annualRecurring)} icon={<Repeat />} tone="orange" hint="From live & maintained sites" />
        <StatCard label="Open tasks" value={a.openTasks} icon={<CheckSquare />} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Payments received" description="Last 6 months" icon={<BarChart3 />} />
          <div className="flex h-64 items-end gap-3 px-5 pb-5 pt-8">
            {a.months.map((m) => {
              const h = Math.round((m.total / maxMonth) * 100);
              const [y, mo] = m.month.split("-");
              const label = new Date(Number(y), Number(mo) - 1, 1).toLocaleString("en-IN", { month: "short" });
              return (
                <div key={m.month} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-[11px] font-medium text-ink-soft">{m.total ? formatMoney(m.total) : ""}</span>
                  <div className="w-full max-w-14 rounded-t-lg bg-orange/85 transition-all" style={{ height: `${Math.max(h, m.total ? 4 : 1)}%`, opacity: m.total ? 1 : 0.25 }} title={formatMoney(m.total)} />
                  <span className="text-xs text-muted">{label}</span>
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <CardHeader title="Pipeline" description="Projects by stage" />
          <ul className="space-y-3 p-5">
            {a.byStage.map((s) => (
              <li key={s.stage} className="grid grid-cols-[120px_1fr_24px] items-center gap-3 text-sm">
                <span className="truncate text-ink-soft">{PIPELINE_LABEL[s.stage]}</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-cream-dark">
                  <div className={s.stage === "live" ? "h-full rounded-full bg-green" : "h-full rounded-full bg-orange"} style={{ width: `${(s.count / maxStage) * 100}%` }} />
                </div>
                <span className="text-right font-medium">{s.count}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader title="Value by service" />
        <ul className="space-y-3 p-5">
          {a.byService.map((s) => (
            <li key={s.service} className="grid grid-cols-[160px_1fr_100px] items-center gap-3 text-sm">
              <span className="truncate text-ink-soft">{labelFor(SERVICE_TYPES, s.service)}</span>
              <div className="h-2.5 overflow-hidden rounded-full bg-cream-dark">
                <div className="h-full rounded-full bg-green" style={{ width: `${(s.value / maxService) * 100}%` }} />
              </div>
              <span className="text-right font-medium">{formatMoney(s.value)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

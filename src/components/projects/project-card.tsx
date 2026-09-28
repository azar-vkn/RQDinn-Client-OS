import Link from "next/link";
import { CalendarDays } from "lucide-react";
import type { ProjectListItem } from "@/server/services/projects";
import { Progress, Avatar } from "@/components/ui/misc";
import { StatusBadge, DemoBadge } from "@/components/shared/status-badge";
import { daysUntil, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ProjectCard({ p, className }: { p: ProjectListItem; className?: string }) {
  const due = daysUntil(p.dueDate);
  return (
    <Link
      href={`/projects/${p.id}`}
      className={cn("group block rounded-xl border border-line bg-white p-4 shadow-card transition duration-150 hover:-translate-y-0.5 hover:border-[#dcd3c5] hover:shadow-lift", className)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted">{p.clientName}</p>
          <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-ink group-hover:text-orange-dark">{p.name}</p>
        </div>
        {p.isDemo && <DemoBadge />}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span className="truncate">{p.phase === "maintenance" ? "Maintenance" : p.phase === "live" ? "Live" : p.stepName ?? "—"}</span>
        <span className="font-medium text-ink-soft">{p.progress}%</span>
      </div>
      <Progress value={p.progress} size="sm" className="mt-1.5" />
      <div className="mt-3.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Avatar name={p.assigneeName ?? "Unassigned"} size="xs" />
          <span className="truncate text-xs text-muted">{p.assigneeName ?? "Unassigned"}</span>
        </div>
        {p.dueDate && p.phase === "active" && (
          <span className={cn("flex shrink-0 items-center gap-1 text-xs", due !== null && due < 0 ? "text-danger" : due !== null && due <= 3 ? "text-amber" : "text-muted")}>
            <CalendarDays className="size-3.5" />
            {formatDate(p.dueDate, "d MMM")}
          </span>
        )}
      </div>
      <div className="mt-3 border-t border-line-soft pt-3">
        <StatusBadge kind="payment" value={p.paymentStatus} />
      </div>
    </Link>
  );
}

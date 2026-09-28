import {
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  FileSignature,
  FileText,
  Globe,
  MessageSquareWarning,
  PartyPopper,
  Rocket,
  Sparkles,
  UserPlus,
  Wrench,
  Upload,
  Dot,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const ICONS: Record<string, { icon: React.ElementType; tone: string }> = {
  "client.created": { icon: UserPlus, tone: "bg-sky-soft text-sky" },
  "project.created": { icon: Sparkles, tone: "bg-orange-soft text-orange-dark" },
  "agreement.generated": { icon: FileSignature, tone: "bg-cream-dark text-ink-soft" },
  "agreement.sent": { icon: FileSignature, tone: "bg-sky-soft text-sky" },
  "agreement.accepted": { icon: FileSignature, tone: "bg-green-light text-green-dark" },
  "invoice.created": { icon: FileText, tone: "bg-cream-dark text-ink-soft" },
  "invoice.sent": { icon: FileText, tone: "bg-sky-soft text-sky" },
  "payment.received": { icon: CircleDollarSign, tone: "bg-green-light text-green-dark" },
  "onboarding.started": { icon: ClipboardCheck, tone: "bg-orange-soft text-orange-dark" },
  "onboarding.completed": { icon: ClipboardCheck, tone: "bg-green-light text-green-dark" },
  "preview.uploaded": { icon: Globe, tone: "bg-cream-dark text-ink-soft" },
  "preview.sent": { icon: Globe, tone: "bg-orange-soft text-orange-dark" },
  "revision.requested": { icon: MessageSquareWarning, tone: "bg-amber-soft text-amber" },
  "revision.completed": { icon: CheckCircle2, tone: "bg-green-light text-green-dark" },
  "project.approved": { icon: PartyPopper, tone: "bg-green-light text-green-dark" },
  "project.launched": { icon: Rocket, tone: "bg-green text-white" },
  "maintenance.created": { icon: Wrench, tone: "bg-orange-soft text-orange-dark" },
  "maintenance.updated": { icon: Wrench, tone: "bg-cream-dark text-ink-soft" },
  "maintenance.started": { icon: Wrench, tone: "bg-green-light text-green-dark" },
  "file.uploaded": { icon: Upload, tone: "bg-cream-dark text-ink-soft" },
  "step.status": { icon: CheckCircle2, tone: "bg-cream-dark text-ink-soft" },
  "task.completed": { icon: CheckCircle2, tone: "bg-green-light text-green-dark" },
};

export interface TimelineItem {
  id: string;
  event: string;
  description: string;
  createdAt: Date | string;
  actorName?: string | null;
  context?: string | null;
}

export function Timeline({ items, className, showActor = true }: { items: TimelineItem[]; className?: string; showActor?: boolean }) {
  // Group by day.
  const groups: { day: string; items: TimelineItem[] }[] = [];
  for (const it of items) {
    const day = formatDate(it.createdAt, "EEEE, d MMMM yyyy");
    const g = groups.find((x) => x.day === day);
    if (g) g.items.push(it);
    else groups.push({ day, items: [it] });
  }
  return (
    <div className={cn("space-y-6", className)}>
      {groups.map((g) => (
        <div key={g.day}>
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-subtle">{g.day}</div>
          <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-line">
            {g.items.map((it) => {
              const meta = ICONS[it.event] ?? { icon: Dot, tone: "bg-cream-dark text-muted" };
              const Icon = meta.icon;
              return (
                <li key={it.id} className="relative flex gap-3.5 animate-rise">
                  <span className={cn("relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white [&_svg]:size-4", meta.tone)}>
                    <Icon />
                  </span>
                  <div className="min-w-0 pt-1">
                    <p className="text-sm text-ink">{it.description}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatDateTime(it.createdAt)}
                      {showActor && it.actorName ? ` · ${it.actorName}` : ""}
                      {it.context ? ` · ${it.context}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}

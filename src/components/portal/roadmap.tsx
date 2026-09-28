import { Check, Circle } from "lucide-react";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface RoadmapStep {
  id: string;
  label: string;
  status: string;
  completedAt: Date | string | null;
  current: boolean;
}

export function Roadmap({ steps, withDates }: { steps: RoadmapStep[]; withDates?: boolean }) {
  return (
    <ol className="space-y-1">
      {steps.map((s, i) => {
        const done = s.status === "completed";
        return (
          <li key={s.id} className="relative flex items-center gap-3 py-1.5">
            {i < steps.length - 1 && <span className={cn("absolute left-[11px] top-8 h-[calc(100%-16px)] w-0.5", done ? "bg-green/50" : "bg-line")} />}
            <span
              className={cn(
                "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full",
                done ? "bg-green text-white" : s.current ? "bg-orange text-white ring-4 ring-orange/20" : "border-[1.5px] border-line bg-white text-subtle",
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : s.current ? <span className="size-1.5 rounded-full bg-white" /> : <Circle className="size-1.5 fill-current" />}
            </span>
            <span className={cn("flex-1 text-[15px]", done ? "text-ink" : s.current ? "font-semibold text-ink" : "text-muted")}>
              {s.label}
              {s.current && <span className="ml-2 text-xs font-semibold uppercase tracking-wider text-orange">Now</span>}
            </span>
            {withDates && done && s.completedAt && <span className="text-xs text-subtle">{formatDate(s.completedAt, "d MMM")}</span>}
          </li>
        );
      })}
    </ol>
  );
}

/** Client-facing roadmap: hides internal steps and uses friendly labels. */
export function clientRoadmap(steps: { id: string; name: string; clientLabel: string | null; clientVisible: boolean; status: string; completedAt: Date | string | null }[], currentId: string | null, phase: string): RoadmapStep[] {
  const currentPos = steps.findIndex((s) => s.id === currentId);
  const visible = steps.filter((s) => s.clientVisible);
  // If the current step is hidden, highlight the next visible one.
  let currentVisibleId: string | null = null;
  if (phase === "active" && currentPos >= 0) {
    const next = steps.slice(currentPos).find((s) => s.clientVisible && s.status !== "completed");
    currentVisibleId = next?.id ?? null;
  }
  return visible.map((s) => ({ id: s.id, label: s.clientLabel || s.name, status: s.status, completedAt: s.completedAt, current: s.id === currentVisibleId }));
}

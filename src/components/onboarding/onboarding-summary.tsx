import { AlertTriangle, CheckCircle2, Circle, Clock } from "lucide-react";
import type { OnboardingComputed } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

export function OnboardingSummary({ computed, compact }: { computed: OnboardingComputed; compact?: boolean }) {
  return (
    <div className={cn("grid gap-5", !compact && "md:grid-cols-2")}>
      <div>
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted">Sections</p>
        <ul className="space-y-2">
          {computed.sections.map((s) => (
            <li key={s.key} className="flex items-center justify-between gap-3 rounded-lg bg-cream/60 px-3 py-2">
              <span className="flex items-center gap-2 text-sm text-ink">
                {s.complete ? <CheckCircle2 className="size-4 text-green" /> : <Circle className="size-4 text-subtle" />}
                {s.title}
              </span>
              <span className="text-xs text-muted">
                {s.answered}/{s.total}
              </span>
            </li>
          ))}
        </ul>
        {computed.sections.some((s) => s.missingRequired.length) && (
          <p className="mt-2 text-xs text-amber">
            Required: {computed.sections.flatMap((s) => s.missingRequired.map((m) => `${s.title} → ${m}`)).join(", ")}
          </p>
        )}
      </div>
      <div>
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted">Assets</p>
        <ul className="space-y-2">
          {computed.assets.map((a) => (
            <li key={a.key} className="flex items-center gap-2 rounded-lg bg-cream/60 px-3 py-2 text-sm">
              {a.state === "received" ? (
                <CheckCircle2 className="size-4 text-green" />
              ) : a.state === "later" ? (
                <Clock className="size-4 text-amber" />
              ) : (
                <AlertTriangle className="size-4 text-amber" />
              )}
              <span className="flex-1">{a.label}</span>
              <span className={cn("text-xs", a.state === "received" ? "text-green-dark" : "text-amber")}>
                {a.state === "received" ? "Received" : a.state === "later" ? "Client will send later" : "Pending"}
              </span>
            </li>
          ))}
        </ul>
        {computed.outstanding.length > 0 && (
          <div className="mt-3 rounded-lg border border-amber/25 bg-amber-soft/60 p-3">
            <p className="text-xs font-semibold text-amber">Outstanding items</p>
            <ul className="mt-1 list-inside list-disc text-sm text-ink-soft">
              {computed.outstanding.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
            <p className="mt-1.5 text-[11px] text-muted">Follow-up tasks are created automatically when onboarding is completed.</p>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { completeOnboardingAction } from "@/server/actions/onboarding";
import type { OnboardingComputed } from "@/lib/onboarding";
import { OnboardingSummary } from "./onboarding-summary";

export function CompletionPanel({
  projectId,
  computed,
  completed,
  canComplete,
  beforeComplete,
  large,
}: {
  projectId: string;
  computed: OnboardingComputed;
  completed: boolean;
  canComplete: boolean;
  beforeComplete?: () => void;
  large?: boolean;
}) {
  const [done, setDone] = React.useState<{ outstanding: string[] } | null>(null);
  const complete = useAction(completeOnboardingAction, { success: false, onSuccess: (d) => setDone(d) });
  const missing = computed.sections.flatMap((s) => s.missingRequired);

  if (done || completed) {
    return (
      <div className="flex flex-col items-center py-8 text-center animate-rise">
        <div className="flex size-16 items-center justify-center rounded-full bg-green-light text-green-dark">
          <PartyPopper className="size-8" />
        </div>
        <h2 className="mt-5 font-serif text-3xl font-medium">Onboarding completed successfully.</h2>
        <p className="mt-2 max-w-md text-muted">
          {done?.outstanding.length
            ? `The project moved to Content Collection. Follow-up tasks were created for: ${done.outstanding.join(", ")}.`
            : completed && !done
              ? "All answers are saved to the project record."
              : "Everything is in — the project moved straight to Development."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href={`/projects/${projectId}`}>Go to project</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href={`/projects/${projectId}?tab=files`}>View files</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <OnboardingSummary computed={computed} />
      {canComplete && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-cream/60 p-6 text-center">
          {missing.length ? (
            <p className="text-sm text-amber">A few required answers are still missing: {missing.join(", ")}.</p>
          ) : (
            <p className="flex items-center gap-2 text-sm text-ink-soft">
              <CheckCircle2 className="size-4 text-green" /> Everything looks good. Complete onboarding to move this project forward.
            </p>
          )}
          <Button
            size={large ? "xl" : "lg"}
            variant="success"
            disabled={missing.length > 0}
            loading={complete.pending}
            loadingText="Completing…"
            onClick={() => {
              beforeComplete?.();
              complete.execute(projectId);
            }}
            className="min-w-64 tracking-wide"
          >
            COMPLETE ONBOARDING
          </Button>
        </div>
      )}
    </div>
  );
}

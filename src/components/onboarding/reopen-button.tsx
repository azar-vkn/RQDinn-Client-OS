"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { reopenOnboardingAction } from "@/server/actions/onboarding";

export function ReopenOnboardingButton({ projectId }: { projectId: string }) {
  const { execute, pending } = useAction(reopenOnboardingAction);
  return (
    <Button variant="secondary" size="sm" loading={pending} onClick={() => confirm("Reopen onboarding for edits? The project stage won't change.") && execute(projectId)}>
      <RotateCcw /> Reopen for edits
    </Button>
  );
}

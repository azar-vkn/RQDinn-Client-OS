"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { markContentCompleteAction, startMaintenanceAction } from "@/server/actions/delivery";
import { sendAgreementAction } from "@/server/actions/agreements";

export type NextAction =
  | { kind: "link"; title: string; description: string; label: string; href: string; secondary?: { label: string; href: string } }
  | { kind: "content"; title: string; description: string }
  | { kind: "maintenance"; title: string; description: string }
  | { kind: "send-agreement"; title: string; description: string; agreementId: string }
  | { kind: "info"; title: string; description: string; secondary?: { label: string; href: string } };

export function NextActionCard({ projectId, action }: { projectId: string; action: NextAction }) {
  const content = useAction(markContentCompleteAction);
  const maint = useAction(startMaintenanceAction);
  const send = useAction(sendAgreementAction);
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-orange/20 bg-gradient-to-r from-orange-soft/70 via-orange-soft/30 to-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange text-white shadow-sm">
          <Sparkles className="size-5" />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-dark">Next step</p>
          <p className="mt-0.5 font-medium text-ink">{action.title}</p>
          <p className="mt-0.5 text-sm text-muted">{action.description}</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {"secondary" in action && action.secondary && (
          <Button variant="secondary" asChild>
            <Link href={action.secondary.href}>{action.secondary.label}</Link>
          </Button>
        )}
        {action.kind === "link" && (
          <Button asChild>
            <Link href={action.href}>
              {action.label} <ArrowRight />
            </Link>
          </Button>
        )}
        {action.kind === "content" && (
          <Button loading={content.pending} onClick={() => content.execute(projectId)}>
            Content received — start development <ArrowRight />
          </Button>
        )}
        {action.kind === "maintenance" && (
          <Button variant="success" loading={maint.pending} onClick={() => maint.execute(projectId)}>
            Move to maintenance <ArrowRight />
          </Button>
        )}
        {action.kind === "send-agreement" && (
          <Button loading={send.pending} onClick={() => send.execute(action.agreementId)}>
            Send agreement to client <ArrowRight />
          </Button>
        )}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Cloud, Loader2, Phone, AlertCircle } from "lucide-react";
import type { OnboardingSection, AnswerState, OnboardingContext } from "@/lib/onboarding";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/misc";
import { Label } from "@/components/ui/input";
import { setSectionAction } from "@/server/actions/onboarding";
import { cn } from "@/lib/utils";
import { useOnboarding, type OnbFile, type OnboardingState } from "./use-onboarding";
import { FieldInput, LaterToggle, SaveIndicator } from "./field-input";
import { CompletionPanel } from "./completion";

export interface WizardData {
  projectId: string;
  clientName: string;
  projectName: string;
  ctx: OnboardingContext;
  sections: OnboardingSection[];
  answers: Record<string, AnswerState>;
  filesByField: Record<string, OnbFile[]>;
  status: string;
  currentSection: string;
}

export function SaveStatus({ ob }: { ob: OnboardingState }) {
  if (ob.saving)
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
        <Loader2 className="size-3.5 animate-spin" /> Saving…
      </span>
    );
  if (ob.hasErrors)
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-danger">
        <AlertCircle className="size-3.5" /> Some answers weren&apos;t saved
      </span>
    );
  if (ob.lastSavedAt)
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-green-dark">
        <Check className="size-3.5" /> Saved
      </span>
    );
  return (
    <span className="flex items-center gap-1.5 text-xs text-subtle">
      <Cloud className="size-3.5" /> Autosave on
    </span>
  );
}

export function OnboardingWizard({ data, mode }: { data: WizardData; mode: "admin" | "portal" }) {
  const ob = useOnboarding({ projectId: data.projectId, ctx: data.ctx, initialAnswers: data.answers, initialFiles: data.filesByField });
  const sections = data.sections;
  const initial = Math.max(0, sections.findIndex((s) => s.key === data.currentSection));
  const [index, setIndex] = React.useState(initial);
  const section = sections[index];
  const completed = data.status === "completed";
  const readOnly = mode === "portal" && completed;
  const topRef = React.useRef<HTMLDivElement>(null);

  const go = (i: number) => {
    ob.flushAll();
    const next = Math.max(0, Math.min(sections.length - 1, i));
    setIndex(next);
    setSectionAction(data.projectId, sections[next].key).catch(() => {});
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const sectionStats = (key: string) => ob.computed.sections.find((s) => s.key === key);

  return (
    <div ref={topRef} className="scroll-mt-24">
      <Card className="mb-5 overflow-hidden">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange">Onboarding</p>
            <h1 className="mt-1 font-serif text-2xl font-medium sm:text-[28px]">{data.clientName}</h1>
            <p className="text-sm text-muted">{data.projectName}</p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <SaveStatus ob={ob} />
            {mode === "admin" && !completed && (
              <Button size="sm" asChild>
                <Link href={`/call/${data.projectId}`}>
                  <Phone /> Onboarding Call Mode
                </Link>
              </Button>
            )}
          </div>
        </div>
        <div className="border-t border-line-soft bg-cream/40 px-5 py-3">
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="font-medium text-ink-soft">Progress</span>
            <span className="font-semibold text-ink">{ob.computed.progress}%</span>
          </div>
          <Progress value={ob.computed.progress} />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        {/* Section stepper */}
        <nav className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
          {sections.map((s, i) => {
            const st = sectionStats(s.key);
            const done = s.key === "confirm" ? completed : st?.complete && (st?.answered ?? 0) > 0;
            return (
              <button
                key={s.key}
                onClick={() => go(i)}
                className={cn(
                  "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
                  i === index ? "bg-white font-medium text-ink shadow-card ring-1 ring-line" : "text-ink-soft hover:bg-cream-dark/60",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                    done ? "bg-green text-white" : i === index ? "bg-orange text-white" : "bg-cream-dark text-muted",
                  )}
                >
                  {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                </span>
                <span className="flex-1 whitespace-nowrap">{s.title}</span>
                {st && <span className="hidden text-[11px] text-subtle lg:inline">{st.answered}/{st.total}</span>}
              </button>
            );
          })}
        </nav>

        <Card className="min-w-0">
          <div className="border-b border-line-soft px-5 py-4 sm:px-6">
            <p className="text-xs text-subtle">
              Step {index + 1} of {sections.length}
            </p>
            <h2 className="font-serif text-xl font-medium">{section.title}</h2>
            <p className="text-sm text-muted">{section.description}</p>
          </div>
          <div className="px-5 py-6 sm:px-6">
            {section.key === "confirm" ? (
              mode === "admin" ? (
                <CompletionPanel projectId={data.projectId} computed={ob.computed} completed={completed} canComplete={!completed} beforeComplete={ob.flushAll} />
              ) : (
                <div className="space-y-5">
                  <div className="flex gap-3 rounded-xl bg-green-soft p-4 text-sm">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green" />
                    <p>
                      {completed
                        ? "Onboarding is complete — thank you! The RQdinn team has everything recorded."
                        : "Thank you! Your answers are saved automatically. The RQdinn team will review them and confirm during your onboarding call."}
                    </p>
                  </div>
                  <CompletionPanel projectId={data.projectId} computed={ob.computed} completed={false} canComplete={false} />
                </div>
              )
            ) : (
              <div className="space-y-7">
                {section.fields.map((f) => (
                  <div key={f.key} className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Label htmlFor={f.key} className="text-sm">
                        {f.label}
                        {f.required && <span className="ml-0.5 text-orange">*</span>}
                      </Label>
                      <div className="flex items-center gap-3">
                        <SaveIndicator state={ob.fieldState[f.key]} />
                        <LaterToggle field={f} ob={ob} readOnly={readOnly} />
                      </div>
                    </div>
                    <FieldInput field={f} ob={ob} projectId={data.projectId} readOnly={readOnly} />
                    {f.help && <p className="text-xs text-muted">{f.help}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-line-soft bg-[#fcfaf6] px-5 py-4 sm:px-6">
            <Button variant="secondary" onClick={() => go(index - 1)} disabled={index === 0}>
              <ArrowLeft /> Previous
            </Button>
            {index < sections.length - 1 && (
              <Button onClick={() => go(index + 1)}>
                Next <ArrowRight />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

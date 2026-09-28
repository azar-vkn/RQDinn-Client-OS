"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Clock, ListChecks, Mic, NotebookPen, Timer, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/misc";
import { Textarea } from "@/components/ui/input";
import { saveCallNotesAction, setSectionAction } from "@/server/actions/onboarding";
import { cn } from "@/lib/utils";
import { useOnboarding } from "./use-onboarding";
import { FieldInput, SaveIndicator } from "./field-input";
import { CompletionPanel } from "./completion";
import { SaveStatus, type WizardData } from "./onboarding-wizard";

type Step = { sectionIndex: number; fieldIndex: number } | { summary: true };

export function CallMode({ data, meetingLink, callNotes }: { data: WizardData; meetingLink: string | null; callNotes: string | null }) {
  const router = useRouter();
  const ob = useOnboarding({ projectId: data.projectId, ctx: data.ctx, initialAnswers: data.answers, initialFiles: data.filesByField });
  const questionSections = data.sections.filter((s) => s.fields.length);
  const flat = React.useMemo(() => questionSections.flatMap((s, si) => s.fields.map((f, fi) => ({ s, f, si, fi }))), [questionSections]);

  // Start at the first unanswered question of the saved section.
  const startIndex = React.useMemo(() => {
    const fromSection = flat.findIndex((q) => q.s.key === data.currentSection);
    const from = fromSection >= 0 ? fromSection : 0;
    const unanswered = flat.findIndex((q, i) => i >= from && !data.answers[q.f.key] && !(data.filesByField[q.f.key]?.length));
    return unanswered >= 0 ? unanswered : from;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [pos, setPos] = React.useState(startIndex); // flat.length === summary
  const [notes, setNotes] = React.useState(callNotes ?? "");
  const [notesState, setNotesState] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const [panel, setPanel] = React.useState<"questions" | "notes" | null>(null);
  const [elapsed, setElapsed] = React.useState(0);
  const notesTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const completed = data.status === "completed";

  React.useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const current = pos < flat.length ? flat[pos] : null;
  const go = (next: number) => {
    ob.flushAll();
    const clamped = Math.max(0, Math.min(flat.length, next));
    setPos(clamped);
    const sec = clamped < flat.length ? flat[clamped].s.key : "confirm";
    setSectionAction(data.projectId, sec).catch(() => {});
  };

  const saveNotes = (v: string) => {
    setNotes(v);
    setNotesState("idle");
    clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(async () => {
      setNotesState("saving");
      const res = await saveCallNotesAction(data.projectId, v).catch(() => ({ ok: false as const, error: "" }));
      setNotesState(res.ok ? "saved" : "error");
    }, 800);
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const questionList = (
    <div className="space-y-5">
      {questionSections.map((s) => {
        const st = ob.computed.sections.find((x) => x.key === s.key);
        return (
          <div key={s.key}>
            <p className="mb-1.5 flex items-center justify-between px-2 text-[11px] font-semibold uppercase tracking-wider text-subtle">
              {s.title}
              <span>
                {st?.answered}/{st?.total}
              </span>
            </p>
            <ul className="space-y-0.5">
              {s.fields.map((f) => {
                const i = flat.findIndex((q) => q.f.key === f.key);
                const a = ob.answers[f.key];
                const hasFiles = (ob.files[f.key]?.length ?? 0) > 0;
                const answered = hasFiles || (a && a.status === "answered" && a.value !== null && a.value !== "" && !(Array.isArray(a.value) && !a.value.length));
                const later = a?.status === "client_later";
                return (
                  <li key={f.key}>
                    <button
                      onClick={() => {
                        go(i);
                        setPanel(null);
                      }}
                      className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition", i === pos ? "bg-orange-soft text-ink" : "text-ink-soft hover:bg-cream")}
                    >
                      {answered ? (
                        <Check className="size-3.5 shrink-0 text-green" strokeWidth={3} />
                      ) : later ? (
                        <Clock className="size-3.5 shrink-0 text-amber" />
                      ) : a?.status === "not_applicable" ? (
                        <X className="size-3.5 shrink-0 text-subtle" />
                      ) : (
                        <span className="ml-1 mr-0.5 size-1.5 shrink-0 rounded-full bg-line" />
                      )}
                      <span className="truncate">{f.label}</span>
                      {f.required && !answered && <span className="text-orange">*</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      <button
        onClick={() => {
          go(flat.length);
          setPanel(null);
        }}
        className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px] font-medium", pos === flat.length ? "bg-green-light text-green-dark" : "text-ink-soft hover:bg-cream")}
      >
        <ListChecks className="size-4" /> Summary & completion
      </button>
    </div>
  );

  const notesPanel = (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <NotebookPen className="size-4 text-muted" /> Quick notes
        </p>
        <span className="text-[11px] text-muted">{notesState === "saving" ? "Saving…" : notesState === "saved" ? "Saved" : notesState === "error" ? "Not saved" : ""}</span>
      </div>
      <Textarea value={notes} onChange={(e) => saveNotes(e.target.value)} placeholder="Anything worth remembering from the call…" className="min-h-48 flex-1 resize-none text-[15px]" />
      <button
        type="button"
        disabled
        title="Voice notes are coming soon"
        className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-dashed border-line py-3 text-sm text-subtle"
      >
        <Mic className="size-4" /> Voice note — coming soon
      </button>
    </div>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href={`/projects/${data.projectId}`} aria-label="Exit call mode">
              <ArrowLeft />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold uppercase tracking-[0.12em] text-ink sm:text-base">
              {data.clientName} <span className="text-orange">— Onboarding call</span>
            </p>
            <p className="truncate text-xs text-muted">{data.projectName}</p>
          </div>
          <div className="hidden items-center gap-4 sm:flex">
            <SaveStatus ob={ob} />
            <span className="flex items-center gap-1.5 font-mono text-xs text-muted">
              <Timer className="size-3.5" /> {mm}:{ss}
            </span>
          </div>
          {meetingLink && (
            <Button variant="secondary" size="sm" asChild>
              <a href={meetingLink} target="_blank" rel="noreferrer">
                <Video /> <span className="hidden sm:inline">Join meeting</span>
              </a>
            </Button>
          )}
          <Button variant="secondary" size="icon-sm" className="xl:hidden" onClick={() => setPanel(panel === "questions" ? null : "questions")} aria-label="All questions">
            <ListChecks />
          </Button>
          <Button variant="secondary" size="icon-sm" className="xl:hidden" onClick={() => setPanel(panel === "notes" ? null : "notes")} aria-label="Quick notes">
            <NotebookPen />
          </Button>
        </div>
        <div className="flex items-center gap-3 px-4 pb-3 sm:px-6">
          <Progress value={ob.computed.progress} className="flex-1" />
          <span className="w-10 text-right text-xs font-semibold">{ob.computed.progress}%</span>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1500px] flex-1 gap-6 px-4 py-6 sm:px-6 xl:grid-cols-[260px_1fr_300px]">
        <aside className="scrollbar-thin hidden max-h-[calc(100dvh-180px)] overflow-y-auto xl:sticky xl:top-[130px] xl:block">{questionList}</aside>

        <main className="flex min-w-0 flex-col">
          {completed && (
            <div className="mx-auto mb-6 flex w-full max-w-2xl items-center gap-2.5 rounded-xl border border-green/25 bg-green-soft px-4 py-3 text-sm text-ink-soft">
              <Check className="size-4 shrink-0 text-green" strokeWidth={3} />
              Onboarding is already completed. Changes you make here still save to the project record.
            </div>
          )}
          {current ? (
            <div key={current.f.key} className="mx-auto w-full max-w-2xl animate-rise">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange">
                {current.s.title} · Question {current.fi + 1} of {current.s.fields.length}
              </p>
              <h2 className="mt-3 font-serif text-[26px] font-medium leading-snug text-ink sm:text-[32px]">“{current.f.question}”</h2>
              <p className="mt-2 flex items-center gap-2 text-sm text-muted">
                {current.f.label}
                {current.f.required && <span className="text-orange">· required</span>}
                <SaveIndicator state={ob.fieldState[current.f.key]} />
              </p>
              <div className="mt-6">
                <FieldInput field={current.f} ob={ob} projectId={data.projectId} large autoFocus onEnter={() => go(pos + 1)} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {ob.answers[current.f.key]?.status !== "client_later" && !(ob.files[current.f.key]?.length) && (
                  <Button variant="secondary" size="sm" onClick={() => ob.setStatus(current.f.key, "client_later")}>
                    <Clock /> Client will send later
                  </Button>
                )}
                {!current.f.required && ob.answers[current.f.key]?.status !== "not_applicable" && (
                  <Button variant="ghost" size="sm" onClick={() => { ob.setStatus(current.f.key, "not_applicable"); go(pos + 1); }}>
                    Not applicable
                  </Button>
                )}
              </div>
              <p className="mt-8 hidden text-xs text-subtle sm:block">Tip: press Enter to save and go to the next question (Ctrl+Enter in long answers).</p>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-3xl animate-rise">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange">Onboarding summary</p>
              <h2 className="mb-6 mt-2 font-serif text-3xl font-medium">Let&apos;s confirm everything with {data.clientName}</h2>
              <CompletionPanel projectId={data.projectId} computed={ob.computed} completed={completed} canComplete={!completed} beforeComplete={ob.flushAll} large />
            </div>
          )}
        </main>

        <aside className="hidden xl:sticky xl:top-[130px] xl:block xl:h-[calc(100dvh-180px)]">{notesPanel}</aside>
      </div>

      {/* Mobile/tablet side panels */}
      {panel && (
        <div className="fixed inset-0 z-40 xl:hidden" onClick={() => setPanel(null)}>
          <div className="absolute inset-0 bg-ink/30" />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-white p-5 shadow-pop animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex justify-end">
              <Button variant="ghost" size="icon-sm" onClick={() => setPanel(null)} aria-label="Close">
                <X />
              </Button>
            </div>
            <div className="scrollbar-thin flex-1 overflow-y-auto">{panel === "questions" ? questionList : notesPanel}</div>
          </div>
        </div>
      )}

      {/* Sticky footer */}
      <footer className="pb-safe sticky bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center gap-2 px-4 py-3 sm:px-6">
          <Button variant="secondary" size="lg" onClick={() => go(pos - 1)} disabled={pos === 0}>
            <ArrowLeft /> <span className="hidden sm:inline">Previous</span>
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={() => {
              ob.flushAll();
              router.push(`/projects/${data.projectId}?tab=onboarding`);
            }}
          >
            Save &amp; Exit
          </Button>
          <div className="flex-1" />
          {pos < flat.length ? (
            <>
              <Button variant="ghost" size="lg" className="hidden md:inline-flex" onClick={() => go(flat.length)}>
                {completed ? "View summary" : "Complete Onboarding"}
              </Button>
              <Button size="lg" onClick={() => go(pos + 1)} className="min-w-32">
                Next <ArrowRight />
              </Button>
            </>
          ) : (
            <span className="text-sm text-muted">{completed ? "Completed" : "Review & complete above"}</span>
          )}
        </div>
      </footer>
    </div>
  );
}

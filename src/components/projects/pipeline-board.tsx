import type { ProjectListItem } from "@/server/services/projects";
import { PIPELINE_LABEL, type PipelineStageValue } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ProjectCard } from "./project-card";

const DOT: Record<PipelineStageValue, string> = {
  new: "bg-sky",
  onboarding: "bg-amber",
  development: "bg-orange",
  review: "bg-orange-light",
  payment_pending: "bg-amber",
  ready_to_launch: "bg-green",
  live: "bg-green",
};

export function PipelineBoard({ columns }: { columns: { stage: PipelineStageValue; projects: ProjectListItem[] }[] }) {
  return (
    <div className="scrollbar-thin -mx-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex min-w-max gap-3.5">
        {columns.map((col) => (
          <section key={col.stage} className="flex w-[264px] shrink-0 flex-col rounded-2xl bg-cream-dark/45 p-2.5">
            <header className="flex items-center justify-between px-1.5 pb-2.5 pt-1">
              <div className="flex items-center gap-2">
                <span className={cn("size-2 rounded-full", DOT[col.stage])} />
                <h3 className="text-[13px] font-semibold text-ink-soft">{PIPELINE_LABEL[col.stage]}</h3>
              </div>
              <span className="rounded-full bg-white px-2 text-xs font-medium text-muted">{col.projects.length}</span>
            </header>
            <div className="flex flex-col gap-2.5">
              {col.projects.length ? (
                col.projects.map((p) => <ProjectCard key={p.id} p={p} />)
              ) : (
                <div className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-xs text-subtle">Nothing here</div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { BriefcaseBusiness, ExternalLink, Globe, Pencil, Plus, Search, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PortfolioEntry } from "@/server/services/portfolio";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/layout";
import { PortfolioCover, hostnameOf } from "./portfolio-cover";
import { PortfolioEditor, type LiveProject } from "./portfolio-editor";

export function PortfolioGrid({ items, isAdmin, liveProjects }: { items: PortfolioEntry[]; isAdmin: boolean; liveProjects: LiveProject[] }) {
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [editing, setEditing] = React.useState<PortfolioEntry | "new" | null>(null);

  const categories = React.useMemo(() => [...new Set(items.map((i) => i.category).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b)), [items]);
  const activeCategory = category === "all" || categories.includes(category) ? category : "all";

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (activeCategory !== "all" && i.category !== activeCategory) return false;
      if (!q) return true;
      return [i.title, i.clientName ?? "", i.category ?? "", i.description ?? "", i.url, ...i.tags].join(" ").toLowerCase().includes(q);
    });
  }, [items, query, activeCategory]);

  const dialog = isAdmin && (
    <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
      {editing !== null && (
        <PortfolioEditor
          key={editing === "new" ? "new" : editing.id}
          item={editing === "new" ? null : editing}
          categories={categories}
          liveProjects={liveProjects}
          onDone={() => setEditing(null)}
        />
      )}
    </Dialog>
  );

  if (!items.length) {
    return (
      <>
        <Card>
          <EmptyState
            icon={<BriefcaseBusiness />}
            title="Your portfolio is empty"
            description={isAdmin ? "Add the websites and apps you've built. Each card links straight to the live site." : "An admin hasn't added any projects yet."}
            action={
              isAdmin ? (
                <Button onClick={() => setEditing("new")}>
                  <Plus /> Add your first project
                </Button>
              ) : undefined
            }
          />
        </Card>
        {dialog}
      </>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects, clients, tags" className="pl-9" aria-label="Search portfolio" />
          </div>
          {isAdmin && (
            <Button className="ml-auto shrink-0" onClick={() => setEditing("new")}>
              <Plus /> Add project
            </Button>
          )}
        </div>
        {categories.length > 0 && (
          <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            {["all", ...categories].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={activeCategory === c}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-medium transition",
                  activeCategory === c ? "border-ink bg-ink text-cream" : "border-line bg-white text-ink-soft hover:border-[#d9d1c4]",
                )}
              >
                {c === "all" ? `All (${items.length})` : c}
              </button>
            ))}
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <Card>
          <EmptyState compact icon={<Search />} title="No projects match" description="Try a different search or category." />
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => {
            const meta = [item.clientName, item.category, item.year].filter(Boolean).join(" · ");
            return (
              <Card key={item.id} className="group flex flex-col overflow-hidden transition hover:shadow-lift">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="relative block aspect-[16/10] overflow-hidden border-b border-line-soft bg-cream" aria-label={`Visit ${item.title}`}>
                  <PortfolioCover title={item.title} url={item.url} imageUrl={item.imageUrl} className="transition duration-500 group-hover:scale-[1.03]" />
                  {item.isFeatured && (
                    <Badge tone="dark" className="absolute left-3 top-3 shadow-card">
                      <Star className="fill-current" /> Featured
                    </Badge>
                  )}
                </a>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-medium text-ink">{item.title}</h3>
                      {meta && <p className="mt-0.5 truncate text-xs text-muted">{meta}</p>}
                    </div>
                    {isAdmin && (
                      <Button variant="ghost" size="icon-sm" className="-mr-2 -mt-1 shrink-0" onClick={() => setEditing(item)} aria-label={`Edit ${item.title}`}>
                        <Pencil />
                      </Button>
                    )}
                  </div>
                  {item.description && <p className="mt-2.5 line-clamp-3 text-sm text-ink-soft">{item.description}</p>}
                  {item.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {item.tags.map((t) => (
                        <Badge key={t} tone="neutral" className="font-normal">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                    <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
                      <Globe className="size-3.5 shrink-0" />
                      <span className="truncate">{hostnameOf(item.url)}</span>
                    </span>
                    <Button asChild size="sm" variant="secondary" className="shrink-0">
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        Visit site <ExternalLink />
                      </a>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {dialog}
    </div>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Dialog } from "radix-ui";
import {
  BarChart3,
  Building2,
  CheckSquare,
  CircleDollarSign,
  ClipboardList,
  FileText,
  FolderKanban,
  GitBranch,
  LayoutDashboard,
  Loader2,
  Plus,
  Receipt,
  Search,
  Settings,
  Wrench,
} from "lucide-react";
import type { SearchResult } from "@/server/services/dashboard";

const TYPE_ICON: Record<SearchResult["type"], React.ElementType> = {
  client: Building2,
  project: FolderKanban,
  invoice: Receipt,
  document: FileText,
  task: CheckSquare,
  maintenance: Wrench,
};
const TYPE_LABEL: Record<SearchResult["type"], string> = {
  client: "Clients",
  project: "Projects",
  invoice: "Invoices",
  document: "Documents",
  task: "Tasks",
  maintenance: "Maintenance requests",
};

const NAV = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Clients", href: "/clients", icon: Building2 },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Payments", href: "/payments", icon: CircleDollarSign },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Onboarding", href: "/onboarding", icon: ClipboardList },
  { label: "Workflows", href: "/workflows", icon: GitBranch },
  { label: "Maintenance", href: "/maintenance", icon: Wrench },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

const ACTIONS = [
  { label: "New client", href: "/clients?new=1", icon: Plus },
  { label: "New project", href: "/projects?new=1", icon: Plus },
  { label: "New invoice", href: "/invoices/new", icon: Plus },
];

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  React.useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      setError(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setResults(data.results);
        setError(false);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError(true);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const grouped = Object.entries(
    results.reduce<Record<string, SearchResult[]>>((acc, r) => {
      (acc[r.type] ??= []).push(r);
      return acc;
    }, {}),
  ) as [SearchResult["type"], SearchResult[]][];

  const itemCls =
    "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-soft data-[selected=true]:bg-cream data-[selected=true]:text-ink [&_svg]:size-4 [&_svg]:text-muted";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/35 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-[12vh] z-50 w-[calc(100%-24px)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-line bg-white shadow-pop data-[state=open]:animate-rise">
          <Dialog.Title className="sr-only">Search</Dialog.Title>
          <Dialog.Description className="sr-only">Search clients, projects, invoices, documents, tasks and maintenance requests</Dialog.Description>
          <Command shouldFilter={q.trim().length < 2} loop>
            <div className="flex items-center gap-3 border-b border-line-soft px-4">
              {loading ? <Loader2 className="size-4 animate-spin text-muted" /> : <Search className="size-4 text-muted" />}
              <Command.Input
                value={q}
                onValueChange={setQ}
                placeholder="Search clients, projects, invoices, tasks…"
                className="h-13 flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle"
              />
            </div>
            <Command.List className="scrollbar-thin max-h-[60vh] overflow-y-auto p-2">
              {q.trim().length >= 2 ? (
                <>
                  {error && <div className="px-3 py-6 text-center text-sm text-danger">Search failed. Please try again.</div>}
                  {!loading && !error && results.length === 0 && <div className="px-3 py-8 text-center text-sm text-muted">No results for “{q}”.</div>}
                  {grouped.map(([type, items]) => {
                    const Icon = TYPE_ICON[type];
                    return (
                      <Command.Group key={type} heading={TYPE_LABEL[type]} className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-subtle">
                        {items.map((r) => (
                          <Command.Item key={`${type}-${r.id}`} value={`${type}-${r.id}`} onSelect={() => go(r.href)} className={itemCls}>
                            <Icon />
                            <span className="min-w-0 flex-1 truncate">{r.title}</span>
                            <span className="truncate text-xs text-subtle">{r.subtitle}</span>
                          </Command.Item>
                        ))}
                      </Command.Group>
                    );
                  })}
                </>
              ) : (
                <>
                  <Command.Group heading="Quick actions" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-subtle">
                    {ACTIONS.map((a) => (
                      <Command.Item key={a.href} value={a.label} onSelect={() => go(a.href)} className={itemCls}>
                        <a.icon /> {a.label}
                      </Command.Item>
                    ))}
                  </Command.Group>
                  <Command.Group heading="Go to" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-subtle">
                    {NAV.map((n) => (
                      <Command.Item key={n.href} value={n.label} onSelect={() => go(n.href)} className={itemCls}>
                        <n.icon /> {n.label}
                      </Command.Item>
                    ))}
                  </Command.Group>
                </>
              )}
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

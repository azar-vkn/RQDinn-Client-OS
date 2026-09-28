"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** URL-driven search + filters (server components re-render with the new query). */
export function FilterBar({
  placeholder = "Search…",
  filters = [],
  className,
  children,
}: {
  placeholder?: string;
  filters?: { name: string; label: string; options: readonly { value: string; label: string }[] }[];
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = React.useState(sp.get("q") ?? "");
  const [, startTransition] = React.useTransition();

  const update = React.useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(sp.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete("new");
      startTransition(() => router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false }));
    },
    [pathname, router, sp],
  );

  React.useEffect(() => {
    const t = setTimeout(() => {
      if ((sp.get("q") ?? "") !== q) update("q", q);
    }, 250);
    return () => clearTimeout(t);
  }, [q, sp, update]);

  return (
    <div className={cn("mb-5 flex flex-col gap-2.5 sm:flex-row sm:items-center", className)}>
      <div className="relative flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="pl-9 pr-8" aria-label="Search" />
        {q && (
          <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-subtle hover:text-ink" aria-label="Clear search">
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2.5">
        {filters.map((f) => (
          <Select key={f.name} value={sp.get(f.name) ?? ""} onChange={(e) => update(f.name, e.target.value)} className="w-auto min-w-40" aria-label={f.label}>
            <option value="">{f.label}</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        ))}
        {children}
      </div>
    </div>
  );
}

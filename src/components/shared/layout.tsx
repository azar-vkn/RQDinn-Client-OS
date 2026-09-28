import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  breadcrumbs,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="min-w-0 lg:shrink-0 lg:max-w-[60%]">
        {breadcrumbs && (
          <nav className="mb-2 flex flex-wrap items-center gap-1 text-[13px] text-muted" aria-label="Breadcrumb">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-3.5 text-subtle" />}
                {b.href ? (
                  <Link href={b.href} className="transition hover:text-ink">
                    {b.label}
                  </Link>
                ) : (
                  <span className="text-ink-soft">{b.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        {eyebrow && <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-orange">{eyebrow}</div>}
        <h1 className="font-serif text-[28px] font-medium leading-tight tracking-tight text-ink sm:text-[32px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[15px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", compact ? "px-4 py-8" : "px-6 py-14", className)}>
      {icon && (
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-line bg-cream text-muted [&_svg]:size-5">{icon}</div>
      )}
      <p className="font-medium text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = "neutral",
  href,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "neutral" | "orange" | "green";
  href?: string;
}) {
  const inner = (
    <div className="group relative flex h-full flex-col justify-between gap-5 rounded-2xl border border-line bg-white p-5 shadow-card transition hover:shadow-lift">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-muted">{label}</span>
        {icon && (
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-lg [&_svg]:size-4",
              tone === "orange" ? "bg-orange-soft text-orange-dark" : tone === "green" ? "bg-green-light text-green-dark" : "bg-cream text-muted",
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <div>
        <div className="font-serif text-[34px] font-medium leading-none tracking-tight text-ink">{value}</div>
        {hint && <div className="mt-2 text-xs text-muted">{hint}</div>}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function SectionTitle({ children, action, className }: { children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="text-[15px] font-semibold text-ink">{children}</h2>
      {action}
    </div>
  );
}

export function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 py-2 text-sm sm:grid-cols-[150px_1fr]">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-ink">{children ?? <span className="text-subtle">—</span>}</dd>
    </div>
  );
}

/** Link-based tabs (server-rendered, shareable URLs). */
export function LinkTabs({ tabs, active, className }: { tabs: { key: string; label: string; href: string; count?: number }[]; active: string; className?: string }) {
  return (
    <div className={cn("no-scrollbar -mx-4 mb-6 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0", className)}>
      <nav className="flex min-w-max gap-1">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            scroll={false}
            className={cn(
              "relative flex items-center gap-2 px-3 pb-3 pt-1 text-sm font-medium transition",
              active === t.key ? "text-ink after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-orange" : "text-muted hover:text-ink",
            )}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={cn("rounded-full px-1.5 text-[11px]", active === t.key ? "bg-orange-soft text-orange-dark" : "bg-cream-dark text-muted")}>{t.count}</span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}

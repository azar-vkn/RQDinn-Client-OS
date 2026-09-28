import * as React from "react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

export function Progress({ value, className, tone = "orange", size = "md" }: { value: number; className?: string; tone?: "orange" | "green"; size?: "sm" | "md" | "lg" }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const h = { sm: "h-1.5", md: "h-2", lg: "h-3" }[size];
  const complete = v >= 100;
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-cream-dark", h, className)} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-700 ease-out", complete || tone === "green" ? "bg-green" : "bg-orange")}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-lg", className)} />;
}

const AVATAR_TONES = ["bg-orange-soft text-orange-dark", "bg-green-light text-green-dark", "bg-sky-soft text-sky", "bg-amber-soft text-amber", "bg-cream-dark text-ink-soft"];

export function Avatar({ name, className, size = "md" }: { name: string | null | undefined; className?: string; size?: "xs" | "sm" | "md" | "lg" }) {
  const n = name ?? "?";
  const tone = AVATAR_TONES[[...n].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  const dim = { xs: "size-5 text-[9px]", sm: "size-7 text-[11px]", md: "size-9 text-xs", lg: "size-12 text-sm" }[size];
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold", tone, dim, className)} title={n}>
      {initials(n)}
    </span>
  );
}

export function Separator({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line-soft", className)} />;
}

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return <kbd className={cn("inline-flex h-5 items-center rounded border border-line bg-white px-1.5 font-sans text-[10px] font-medium text-muted", className)}>{children}</kbd>;
}

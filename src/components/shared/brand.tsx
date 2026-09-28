import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex size-8 items-center justify-center rounded-[10px] bg-ink text-cream shadow-sm", className)}>
      <svg viewBox="0 0 24 24" className="size-[58%]" fill="none" aria-hidden>
        <path d="M6 19V5h6.2a4.3 4.3 0 0 1 0 8.6H6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m12.5 13.6 5 5.4" stroke="#D97757" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function Wordmark({ className, subtitle = true }: { className?: string; subtitle?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-[0.18em] text-ink">RQDINN</span>
        {subtitle && <span className="mt-1 text-[10.5px] font-medium tracking-wide text-muted">Client OS</span>}
      </span>
    </span>
  );
}

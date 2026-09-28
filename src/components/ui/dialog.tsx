"use client";

import * as React from "react";
import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  title,
  description,
  children,
  className,
  size = "md",
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const width = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" }[size];
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-ink/35 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
      <D.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-2xl border border-line bg-white shadow-pop outline-none data-[state=open]:animate-rise",
          "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl",
          width,
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line-soft px-6 pb-4 pt-5">
          <div>
            <D.Title className="font-serif text-xl font-medium text-ink">{title}</D.Title>
            {description ? (
              <D.Description className="mt-1 text-sm text-muted">{description}</D.Description>
            ) : (
              <D.Description className="sr-only">{typeof title === "string" ? title : "Dialog"}</D.Description>
            )}
          </div>
          <D.Close className="-mr-2 rounded-lg p-1.5 text-muted transition hover:bg-cream hover:text-ink" aria-label="Close">
            <X className="size-4.5" />
          </D.Close>
        </div>
        <div className="scrollbar-thin overflow-y-auto px-6 py-5">{children}</div>
      </D.Content>
    </D.Portal>
  );
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("-mx-6 -mb-5 mt-6 flex flex-col-reverse gap-2 border-t border-line-soft bg-[#fcfaf6] px-6 py-4 sm:flex-row sm:justify-end", className)} {...props} />;
}

/** Right-side drawer (full-screen sheet on mobile). */
export function SheetContent({ title, description, children, className }: { title: React.ReactNode; description?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-ink/30 data-[state=open]:animate-fade-in" />
      <D.Content className={cn("fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-line bg-white shadow-pop outline-none data-[state=open]:animate-fade-in", className)}>
        <div className="flex items-start justify-between gap-4 border-b border-line-soft px-6 py-5">
          <div>
            <D.Title className="font-serif text-xl font-medium">{title}</D.Title>
            <D.Description className={description ? "mt-1 text-sm text-muted" : "sr-only"}>{description ?? "Details"}</D.Description>
          </div>
          <D.Close className="-mr-2 rounded-lg p-1.5 text-muted hover:bg-cream hover:text-ink" aria-label="Close">
            <X className="size-4.5" />
          </D.Close>
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </D.Content>
    </D.Portal>
  );
}

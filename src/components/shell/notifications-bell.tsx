"use client";

import * as React from "react";
import Link from "next/link";
import { Popover } from "radix-ui";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { getNotificationsAction, markAllReadAction, markReadAction } from "@/server/actions/notifications";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/layout";

type Item = Awaited<ReturnType<typeof getNotificationsAction>>["items"][number];

export function NotificationsBell({ initialUnread, align = "end" }: { initialUnread: number; align?: "start" | "end" }) {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<Item[] | null>(null);
  const [unread, setUnread] = React.useState(initialUnread);
  const [error, setError] = React.useState(false);

  React.useEffect(() => setUnread(initialUnread), [initialUnread]);

  const load = React.useCallback(async () => {
    try {
      setError(false);
      const res = await getNotificationsAction();
      setItems(res.items);
      setUnread(res.unread);
    } catch {
      setError(true);
    }
  }, []);

  React.useEffect(() => {
    if (open) load();
  }, [open, load]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className="relative flex size-9 items-center justify-center rounded-lg text-ink-soft transition hover:bg-cream-dark/70" aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}>
          <Bell className="size-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-orange px-1 text-[10px] font-semibold leading-4 text-white ring-2 ring-cream">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align={align} sideOffset={8} className="z-50 w-[min(380px,calc(100vw-24px))] rounded-2xl border border-line bg-white shadow-pop data-[state=open]:animate-fade-in">
          <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && (
              <button
                className="flex items-center gap-1 text-xs font-medium text-orange-dark hover:underline"
                onClick={async () => {
                  await markAllReadAction();
                  setUnread(0);
                  setItems((xs) => xs?.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })) ?? null);
                }}
              >
                <CheckCheck className="size-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="scrollbar-thin max-h-[420px] overflow-y-auto p-1.5">
            {error ? (
              <p className="p-6 text-center text-sm text-danger">Couldn&apos;t load notifications. Please try again.</p>
            ) : items === null ? (
              <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted">
                <Loader2 className="size-4 animate-spin" /> Loading…
              </div>
            ) : items.length === 0 ? (
              <EmptyState compact icon={<Bell />} title="You're all caught up" description="New activity on your projects will show up here." />
            ) : (
              items.map((n) => {
                const content = (
                  <div className={cn("flex gap-3 rounded-xl px-3 py-2.5 transition hover:bg-cream", !n.readAt && "bg-orange-soft/40")}>
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-orange")} />
                    <div className="min-w-0">
                      <p className="text-sm text-ink">{n.title}</p>
                      {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{n.body}</p>}
                      <p className="mt-1 text-[11px] text-subtle">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                );
                return n.href ? (
                  <Link
                    key={n.id}
                    href={n.href}
                    onClick={() => {
                      if (!n.readAt) {
                        markReadAction(n.id);
                        setUnread((u) => Math.max(0, u - 1));
                      }
                      setOpen(false);
                    }}
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={n.id}>{content}</div>
                );
              })
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

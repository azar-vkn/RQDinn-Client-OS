"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, CreditCard, FolderOpen, Home, LayoutList, LogOut, MessageCircle, MonitorCheck, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/server/actions/auth";
import { selectPortalProjectAction } from "@/server/actions/portal";
import { Avatar } from "@/components/ui/misc";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { LogoMark } from "@/components/shared/brand";
import { NotificationsBell } from "./notifications-bell";

const NAV = [
  { label: "Home", href: "/portal", icon: Home },
  { label: "Project", href: "/portal/project", icon: LayoutList },
  { label: "Files", href: "/portal/files", icon: FolderOpen },
  { label: "Review", href: "/portal/review", icon: MonitorCheck },
  { label: "Billing", href: "/portal/billing", icon: CreditCard },
  { label: "Updates", href: "/portal/maintenance", icon: Wrench },
  { label: "Contact", href: "/portal/contact", icon: MessageCircle },
];
const MOBILE = [NAV[0], NAV[1], NAV[3], NAV[4], NAV[6]];

const active = (pathname: string, href: string) => (href === "/portal" ? pathname === "/portal" : pathname.startsWith(href));

export function PortalShell({
  user,
  companyName,
  projects,
  currentProjectId,
  unread,
  children,
}: {
  user: { name: string; email: string };
  companyName: string;
  projects: { id: string; name: string }[];
  currentProjectId: string | null;
  unread: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const current = projects.find((p) => p.id === currentProjectId);
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/portal" className="flex items-center gap-2.5">
            <LogoMark />
            <span className="hidden flex-col leading-none sm:flex">
              <span className="text-[13px] font-semibold tracking-[0.16em]">RQDINN</span>
              <span className="mt-1 text-[10.5px] text-muted">Client Portal</span>
            </span>
          </Link>
          <span className="mx-1 hidden h-6 w-px bg-line sm:block" />
          {projects.length > 1 ? (
            <Dropdown>
              <DropdownTrigger className="flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-cream-dark/70">
                <span className="truncate">{current?.name ?? companyName}</span>
                <ChevronDown className="size-3.5 text-muted" />
              </DropdownTrigger>
              <DropdownContent align="start">
                <DropdownLabel>Your projects</DropdownLabel>
                {projects.map((p) => (
                  <DropdownItem key={p.id} onSelect={() => selectPortalProjectAction(p.id)}>
                    {p.name}
                  </DropdownItem>
                ))}
              </DropdownContent>
            </Dropdown>
          ) : (
            <span className="truncate text-sm font-medium text-ink-soft">{companyName}</span>
          )}
          <div className="ml-auto flex items-center gap-1">
            <NotificationsBell initialUnread={unread} />
            <Dropdown>
              <DropdownTrigger className="rounded-full p-0.5 hover:ring-2 hover:ring-line" aria-label="Account">
                <Avatar name={user.name} size="sm" />
              </DropdownTrigger>
              <DropdownContent>
                <DropdownLabel>
                  {user.name}
                  <span className="block font-normal text-subtle">{user.email}</span>
                </DropdownLabel>
                <DropdownSeparator />
                <DropdownItem destructive onSelect={() => logoutAction()}>
                  <LogOut /> Log out
                </DropdownItem>
              </DropdownContent>
            </Dropdown>
          </div>
        </div>
        <nav className="mx-auto hidden max-w-6xl gap-1 px-4 sm:px-6 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "relative flex items-center gap-2 px-3 pb-3 pt-1 text-sm font-medium transition",
                active(pathname, n.href) ? "text-ink after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-orange" : "text-muted hover:text-ink",
              )}
            >
              <n.icon className={cn("size-4", active(pathname, n.href) ? "text-orange" : "")} />
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pt-8 md:pb-16">{children}</main>
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {MOBILE.map((n) => (
            <Link key={n.href} href={n.href} className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium", active(pathname, n.href) ? "text-orange-dark" : "text-muted")}>
              <n.icon className="size-5" />
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

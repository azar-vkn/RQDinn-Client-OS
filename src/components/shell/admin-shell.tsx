"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog } from "radix-ui";
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CheckSquare,
  ChevronsLeft,
  ChevronsRight,
  CircleDollarSign,
  ClipboardList,
  FileText,
  FolderKanban,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Settings,
  User,
  Wrench,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/server/actions/auth";
import { Avatar, Kbd } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { LogoMark, Wordmark } from "@/components/shared/brand";
import { CommandPalette } from "./command-palette";
import { NotificationsBell } from "./notifications-bell";

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
  { label: "Services", href: "/services", icon: Package },
  { label: "Portfolio", href: "/portfolio", icon: BriefcaseBusiness },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

const MOBILE_TABS = [NAV[0], NAV[1], NAV[2], NAV[3]];

interface ShellUser {
  name: string;
  email: string;
  role: string;
  title: string | null;
}

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/projects") return pathname.startsWith("/projects") || pathname.startsWith("/invoices") || pathname.startsWith("/agreements");
  return pathname === href || pathname.startsWith(href + "/");
}

export function AdminShell({ user, unread, children }: { user: ShellUser; unread: number; children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);

  React.useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("rq.sidebar") === "collapsed");
    } catch {}
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem("rq.sidebar", c ? "open" : "collapsed");
      } catch {}
      return !c;
    });
  };

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => setMobileOpen(false), [pathname]);

  const nav = (compact: boolean) => (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={compact ? item.label : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition",
              compact && "justify-center px-0",
              active ? "bg-white text-ink shadow-card ring-1 ring-line" : "text-ink-soft/85 hover:bg-cream-dark/60 hover:text-ink",
            )}
          >
            <item.icon className={cn("size-[18px] shrink-0", active ? "text-orange" : "text-muted group-hover:text-ink-soft")} />
            {!compact && item.label}
          </Link>
        );
      })}
    </nav>
  );

  const userMenu = (compact: boolean) => (
    <Dropdown>
      <DropdownTrigger asChild>
        <button className={cn("flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition hover:bg-cream-dark/60", compact && "justify-center")}>
          <Avatar name={user.name} size="sm" />
          {!compact && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-ink">{user.name}</span>
              <span className="block truncate text-[11px] text-muted">RQdinn Team · {user.role === "admin" ? "Admin" : user.title ?? "Team"}</span>
            </span>
          )}
        </button>
      </DropdownTrigger>
      <DropdownContent align="start" side="top" className="w-56">
        <DropdownLabel>
          {user.name}
          <span className="block font-normal text-subtle">{user.email}</span>
        </DropdownLabel>
        <DropdownSeparator />
        <DropdownItem asChild>
          <Link href="/settings?tab=profile">
            <User /> Profile
          </Link>
        </DropdownItem>
        <DropdownItem asChild>
          <Link href="/settings">
            <Settings /> Settings
          </Link>
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem destructive onSelect={() => logoutAction()}>
          <LogOut /> Log out
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-cream/95 backdrop-blur transition-[width] duration-200 lg:flex",
          collapsed ? "w-[72px]" : "w-[248px]",
        )}
      >
        <div className={cn("flex h-16 items-center", collapsed ? "justify-center" : "justify-between px-4")}>
          <Link href="/dashboard" aria-label="RQdinn dashboard">
            {collapsed ? <LogoMark /> : <Wordmark />}
          </Link>
          {!collapsed && (
            <button onClick={toggle} className="rounded-md p-1.5 text-muted hover:bg-cream-dark hover:text-ink" aria-label="Collapse sidebar">
              <ChevronsLeft className="size-4" />
            </button>
          )}
        </div>
        <div className={cn("scrollbar-thin flex-1 overflow-y-auto pb-4", collapsed ? "px-3" : "px-3")}>
          {collapsed && (
            <button onClick={toggle} className="mb-3 flex w-full justify-center rounded-md p-2 text-muted hover:bg-cream-dark hover:text-ink" aria-label="Expand sidebar">
              <ChevronsRight className="size-4" />
            </button>
          )}
          {nav(collapsed)}
        </div>
        <div className="border-t border-line p-3">{userMenu(collapsed)}</div>
      </aside>

      {/* Mobile drawer */}
      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/35 lg:hidden" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-cream shadow-pop outline-none data-[state=open]:animate-fade-in lg:hidden">
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <Dialog.Description className="sr-only">Main navigation</Dialog.Description>
            <div className="flex h-16 items-center justify-between px-4">
              <Wordmark />
              <Dialog.Close className="rounded-md p-1.5 text-muted hover:bg-cream-dark" aria-label="Close menu">
                <X className="size-5" />
              </Dialog.Close>
            </div>
            <div className="flex-1 overflow-y-auto px-3">{nav(false)}</div>
            <div className="border-t border-line p-3">{userMenu(false)}</div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className={cn("transition-[padding] duration-200", collapsed ? "lg:pl-[72px]" : "lg:pl-[248px]")}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line/70 bg-cream/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <button onClick={() => setMobileOpen(true)} className="-ml-1 rounded-lg p-2 text-ink-soft hover:bg-cream-dark lg:hidden" aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <Link href="/dashboard" className="lg:hidden" aria-label="Dashboard">
            <LogoMark className="size-7" />
          </Link>
          <button
            onClick={() => setPaletteOpen(true)}
            className="ml-auto flex h-9 w-9 items-center justify-center gap-2.5 rounded-lg border border-line bg-white text-sm text-subtle shadow-card transition hover:border-[#d9d1c4] sm:w-full sm:max-w-sm sm:justify-start sm:px-3 lg:ml-0"
            aria-label="Search (Ctrl+K)"
          >
            <Search className="size-4 text-muted" />
            <span className="hidden flex-1 text-left sm:inline">Search clients, projects, invoices…</span>
            <span className="hidden items-center gap-0.5 sm:flex">
              <Kbd>Ctrl</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>
          <div className="flex items-center gap-1 lg:ml-auto">
            <Dropdown>
              <DropdownTrigger asChild>
                <Button size="sm" className="hidden sm:inline-flex">
                  <Plus /> New
                </Button>
              </DropdownTrigger>
              <DropdownContent>
                <DropdownItem asChild>
                  <Link href="/clients?new=1">
                    <Building2 /> New client
                  </Link>
                </DropdownItem>
                <DropdownItem asChild>
                  <Link href="/projects?new=1">
                    <FolderKanban /> New project
                  </Link>
                </DropdownItem>
                <DropdownItem asChild>
                  <Link href="/invoices/new">
                    <FileText /> New invoice
                  </Link>
                </DropdownItem>
              </DropdownContent>
            </Dropdown>
            <NotificationsBell initialUnread={unread} />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-12">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur lg:hidden">
        <div className="grid grid-cols-5">
          {MOBILE_TABS.map((t) => {
            const active = isActive(pathname, t.href);
            return (
              <Link key={t.href} href={t.href} className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium", active ? "text-orange-dark" : "text-muted")}>
                <t.icon className="size-5" />
                {t.label}
              </Link>
            );
          })}
          <button onClick={() => setMobileOpen(true)} className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted">
            <MoreHorizontal className="size-5" />
            More
          </button>
        </div>
      </nav>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

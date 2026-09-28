import { asc, or, eq } from "drizzle-orm";
import { CheckCircle2, Circle } from "lucide-react";
import { requireStaffPage } from "@/server/auth/session";
import { db, dbDriver } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { getAgency } from "@/server/services/settings";
import { listTemplates } from "@/server/services/agreements";
import { channelStatus } from "@/server/integrations/notifications/channels";
import { razorpayProvider } from "@/server/integrations/payments";
import { isDemoMode } from "@/server/demo-mode";
import { PageHeader, LinkTabs } from "@/components/shared/layout";
import { Card, CardHeader } from "@/components/ui/card";
import { AgencyForm, DemoReset, PasswordForm, TeamSection, TemplateEditor } from "@/components/settings/settings-forms";

export const metadata = { title: "Settings" };

const TABS = ["agency", "team", "templates", "integrations", "profile"] as const;

export default async function SettingsPage(props: PageProps<"/settings">) {
  const user = await requireStaffPage();
  const sp = await props.searchParams;
  const tab = (TABS as readonly string[]).includes(String(sp.tab)) ? String(sp.tab) : "agency";
  const isAdmin = user.role === "admin";

  const tabs = [
    { key: "agency", label: "Agency", href: "/settings" },
    { key: "team", label: "Team", href: "/settings?tab=team" },
    { key: "templates", label: "Agreement templates", href: "/settings?tab=templates" },
    { key: "integrations", label: "Integrations", href: "/settings?tab=integrations" },
    { key: "profile", label: "Profile", href: "/settings?tab=profile" },
  ];

  const integrations = [
    ...channelStatus(),
    { name: "Razorpay payments", enabled: false, note: razorpayProvider.isConfigured() ? "Keys found — adapter pending" : "Not configured — payments are recorded manually" },
    { name: "Google Calendar", enabled: false, note: "Manual scheduling (calendar_event_id ready)" },
    { name: "E-signature", enabled: false, note: "Click-through acceptance only" },
    { name: "File storage", enabled: true, note: process.env.STORAGE_DRIVER === "supabase" ? "Supabase Storage (private bucket)" : "Local disk" },
    { name: "Database", enabled: true, note: dbDriver() === "postgres" ? "PostgreSQL (DATABASE_URL)" : "Embedded PostgreSQL (PGlite)" },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Settings" description={isAdmin ? "Configure RQdinn Client OS." : "Your profile and agency information."} />
      <LinkTabs tabs={tabs} active={tab} />

      {tab === "agency" && (
        <Card>
          <CardHeader title="Agency details" description="Used on invoices, agreements, receipts and the client portal." />
          <div className="p-5">
            <AgencyForm agency={await getAgency()} readOnly={!isAdmin} />
          </div>
        </Card>
      )}

      {tab === "team" && (
        <Card>
          <CardHeader title="RQdinn team" description="Admins have full access. Team members see projects they're assigned to." />
          <div className="p-5">
            <TeamSection
              users={await db
                .select({ id: users.id, name: users.name, email: users.email, role: users.role, title: users.title, isActive: users.isActive, lastLoginAt: users.lastLoginAt })
                .from(users)
                .where(or(eq(users.role, "admin"), eq(users.role, "team")))
                .orderBy(asc(users.name))}
              isAdmin={isAdmin}
              currentUserId={user.id}
            />
          </div>
        </Card>
      )}

      {tab === "templates" && (
        <Card>
          <CardHeader title="Agreement templates" />
          <div className="p-5">
            <TemplateEditor templates={await listTemplates()} isAdmin={isAdmin} />
          </div>
        </Card>
      )}

      {tab === "integrations" && (
        <div className="space-y-5">
          <Card>
            <CardHeader title="Integrations" description="Integration points are built in; providers are switched on with environment variables." />
            <ul className="divide-y divide-line-soft">
              {integrations.map((i) => (
                <li key={i.name} className="flex items-center gap-3 px-5 py-3.5">
                  {i.enabled ? <CheckCircle2 className="size-4.5 text-green" /> : <Circle className="size-4.5 text-subtle" />}
                  <span className="flex-1 text-sm font-medium">{i.name}</span>
                  <span className="text-xs text-muted">{i.note}</span>
                </li>
              ))}
            </ul>
          </Card>
          {isAdmin && isDemoMode() && (
            <Card>
              <CardHeader title="Demo data" description="Reset the workspace to the seeded demo state. Useful before a client demo." />
              <div className="p-5">
                <DemoReset />
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === "profile" && (
        <Card>
          <CardHeader title="Your profile" description={`${user.name} · ${user.email}`} />
          <div className="p-5">
            <PasswordForm />
          </div>
        </Card>
      )}
    </div>
  );
}

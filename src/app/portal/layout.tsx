import { requireClientPage } from "@/server/auth/session";
import { getPortalContext } from "@/server/services/portal";
import { unreadCount } from "@/server/services/notifications";
import { PortalShell } from "@/components/shell/portal-shell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireClientPage();
  const [ctx, unread] = await Promise.all([getPortalContext(user), unreadCount(user.id)]);
  return (
    <PortalShell user={{ name: user.name, email: user.email }} companyName={ctx.client.companyName} projects={ctx.projects} currentProjectId={ctx.project?.project.id ?? null} unread={unread}>
      {children}
    </PortalShell>
  );
}

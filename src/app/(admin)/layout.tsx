import { requireStaffPage } from "@/server/auth/session";
import { unreadCount } from "@/server/services/notifications";
import { AdminShell } from "@/components/shell/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaffPage();
  const unread = await unreadCount(user.id);
  return (
    <AdminShell user={{ name: user.name, email: user.email, role: user.role, title: user.title }} unread={unread}>
      {children}
    </AdminShell>
  );
}

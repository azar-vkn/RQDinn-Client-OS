import { requireClientPage } from "@/server/auth/session";
import { getPortalContext } from "@/server/services/portal";
import { listFiles } from "@/server/services/files";
import { Card } from "@/components/ui/card";
import { PageHeader, EmptyState } from "@/components/shared/layout";
import { FileManager } from "@/components/files/file-manager";
import { FILE_FOLDERS, FOOD_INDUSTRIES, GENERAL_FILE_FOLDERS } from "@/lib/constants";

export const metadata = { title: "Files" };

export default async function PortalFiles() {
  const user = await requireClientPage();
  const ctx = await getPortalContext(user);
  if (!ctx.project) return <Card><EmptyState title="No project yet" /></Card>;
  const files = await listFiles({ clientId: ctx.client.id, projectId: ctx.project.project.id });
  return (
    <div className="animate-fade-in">
      <PageHeader title="Files" description="Share your logo, photos, videos, menu and documents with the RQdinn team." />
      <Card className="p-4 sm:p-5">
        <FileManager
          files={files}
          folders={FOOD_INDUSTRIES.includes(ctx.client.industry) ? FILE_FOLDERS : GENERAL_FILE_FOLDERS}
          target={{ projectId: ctx.project.project.id, folder: "Other" }}
          canManage={false}
          currentUserId={user.id}
          emptyText="No files yet. Upload your first file above."
        />
      </Card>
    </div>
  );
}

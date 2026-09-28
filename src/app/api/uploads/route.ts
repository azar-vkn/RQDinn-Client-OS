import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/server/auth/session";
import { assertClientAccess, assertProjectAccess, isStaff } from "@/server/auth/permissions";
import { db } from "@/server/db/client";
import { maintenanceRequests, projects, revisions } from "@/server/db/schema";
import { saveUpload, validateUpload } from "@/server/services/files";
import { logActivity } from "@/server/services/activity";
import { emit } from "@/server/services/notifications";
import { AppError } from "@/server/errors";
import { findField } from "@/lib/onboarding";

/**
 * Multipart upload endpoint used by every uploader in the app.
 * Fields: files[] (one or more), projectId?, clientId?, folder?, onboardingFieldKey?, revisionId?, maintenanceRequestId?
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });

  try {
    const form = await req.formData();
    const files = form.getAll("files").filter((f): f is File => typeof f === "object" && "arrayBuffer" in f);
    if (!files.length) throw new AppError("Choose at least one file to upload.");
    if (files.length > 20) throw new AppError("Upload up to 20 files at a time.");
    files.forEach(validateUpload);

    const str = (k: string) => {
      const v = form.get(k);
      return typeof v === "string" && v.trim() ? v.trim() : null;
    };
    let projectId = str("projectId");
    let clientId = str("clientId");
    const folder = str("folder")?.slice(0, 60) ?? "Other";
    const onboardingFieldKey = str("onboardingFieldKey");
    const revisionId = str("revisionId");
    const maintenanceRequestId = str("maintenanceRequestId");

    if (onboardingFieldKey && findField(onboardingFieldKey)?.type !== "file") throw new AppError("Invalid onboarding field.");

    // Resolve & authorise the owning client/project.
    if (revisionId) {
      const [r] = await db.select({ projectId: revisions.projectId }).from(revisions).where(eq(revisions.id, revisionId));
      if (!r) throw new AppError("Revision not found.", "not_found");
      projectId = r.projectId;
    }
    if (maintenanceRequestId) {
      const [m] = await db.select({ projectId: maintenanceRequests.projectId }).from(maintenanceRequests).where(eq(maintenanceRequests.id, maintenanceRequestId));
      if (!m) throw new AppError("Request not found.", "not_found");
      projectId = m.projectId;
    }
    if (projectId) {
      const p = await assertProjectAccess(user, projectId);
      clientId = p.clientId;
    } else if (clientId) {
      await assertClientAccess(user, clientId);
    } else if (user.role === "client" && user.clientId) {
      clientId = user.clientId;
    } else {
      throw new AppError("Missing project or client for this upload.");
    }

    const saved = [];
    for (const file of files) {
      saved.push(
        await saveUpload({ file, clientId: clientId!, projectId, folder, uploadedById: user.id, onboardingFieldKey, revisionId, maintenanceRequestId }),
      );
    }

    const label = saved.length === 1 ? saved[0].name : `${saved.length} files`;
    await logActivity({
      clientId,
      projectId,
      actorId: user.id,
      event: "file.uploaded",
      description: `${label} uploaded${folder ? ` to ${folder}` : ""}`,
      clientVisible: true,
    });
    if (!isStaff(user)) {
      const [p] = projectId ? await db.select({ name: projects.name }).from(projects).where(eq(projects.id, projectId)) : [];
      await emit({
        event: "file.uploaded",
        actorId: user.id,
        clientId,
        projectId,
        title: `${user.name} uploaded ${label}`,
        body: p?.name,
        staff: { href: projectId ? `/projects/${projectId}?tab=files` : `/clients/${clientId}?tab=files` },
      });
    }

    return NextResponse.json({ files: saved.map((f) => ({ id: f.id, name: f.name, mimeType: f.mimeType, size: f.size, folder: f.folder })) });
  } catch (err) {
    if (err instanceof AppError) {
      const status = err.code === "forbidden" ? 403 : err.code === "not_found" ? 404 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }
    console.error("[upload]", err);
    return NextResponse.json({ error: "Unable to upload file. Please try again." }, { status: 500 });
  }
}

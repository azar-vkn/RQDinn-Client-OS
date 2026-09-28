import crypto from "node:crypto";
import path from "node:path";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { db, type DbOrTx } from "@/server/db/client";
import { files, users } from "@/server/db/schema";
import { storage } from "@/server/integrations/storage";
import { invalid, notFound } from "@/server/errors";

const ALLOWED_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".heic", ".avif",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".ppt", ".pptx", ".txt", ".rtf",
  ".zip", ".ai", ".eps", ".psd", ".fig",
  ".mp4", ".mov", ".webm", ".m4v", ".mp3", ".m4a", ".wav", ".ogg",
]);

/** Types that are safe to render inline in the browser. Everything else downloads. */
export const INLINE_MIME = /^(image\/(png|jpe?g|webp|gif|avif)|application\/pdf|video\/(mp4|webm|quicktime)|audio\/.*)$/;

export function maxUploadBytes() {
  return Number(process.env.MAX_UPLOAD_MB || 25) * 1024 * 1024;
}

export function sanitizeFilename(name: string) {
  const base = path.basename(name).replace(/[^\w.\- ()&]+/g, "_").trim();
  return base.slice(0, 180) || "file";
}

export function validateUpload(file: File) {
  if (!file || typeof file.arrayBuffer !== "function") throw invalid("No file received.");
  if (file.size === 0) throw invalid(`“${file.name}” is empty.`);
  if (file.size > maxUploadBytes())
    throw invalid(`“${file.name}” is larger than ${process.env.MAX_UPLOAD_MB || 25} MB.`);
  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) throw invalid(`“${file.name}”: ${ext || "this"} file type isn't allowed.`);
}

export interface SaveUploadInput {
  file: File;
  clientId: string;
  projectId?: string | null;
  folder?: string | null;
  uploadedById: string;
  onboardingFieldKey?: string | null;
  revisionId?: string | null;
  maintenanceRequestId?: string | null;
}

export async function saveUpload(input: SaveUploadInput, tx: DbOrTx = db) {
  validateUpload(input.file);
  const name = sanitizeFilename(input.file.name);
  const ext = path.extname(name).toLowerCase();
  const storageKey = `${input.clientId}/${crypto.randomUUID()}${ext}`;
  const buffer = Buffer.from(await input.file.arrayBuffer());
  const mimeType = input.file.type || "application/octet-stream";
  await storage().put(storageKey, buffer, mimeType);
  try {
    const [row] = await tx
      .insert(files)
      .values({
        clientId: input.clientId,
        projectId: input.projectId || null,
        folder: input.folder || "Other",
        name,
        storageKey,
        mimeType,
        size: input.file.size,
        uploadedById: input.uploadedById,
        onboardingFieldKey: input.onboardingFieldKey || null,
        revisionId: input.revisionId || null,
        maintenanceRequestId: input.maintenanceRequestId || null,
      })
      .returning();
    return row;
  } catch (err) {
    await storage().remove(storageKey).catch(() => {});
    throw err;
  }
}

export async function listFiles(filter: {
  clientId: string;
  projectId?: string;
  onboardingOnly?: boolean;
  revisionId?: string;
  maintenanceRequestId?: string;
}) {
  const conds: SQL[] = [eq(files.clientId, filter.clientId)];
  if (filter.projectId) conds.push(eq(files.projectId, filter.projectId));
  if (filter.onboardingOnly) conds.push(sql`${files.onboardingFieldKey} is not null`);
  if (filter.revisionId) conds.push(eq(files.revisionId, filter.revisionId));
  if (filter.maintenanceRequestId) conds.push(eq(files.maintenanceRequestId, filter.maintenanceRequestId));
  return db
    .select({
      id: files.id,
      name: files.name,
      folder: files.folder,
      mimeType: files.mimeType,
      size: files.size,
      createdAt: files.createdAt,
      projectId: files.projectId,
      onboardingFieldKey: files.onboardingFieldKey,
      revisionId: files.revisionId,
      maintenanceRequestId: files.maintenanceRequestId,
      uploadedById: files.uploadedById,
      uploadedByName: users.name,
      uploadedByRole: users.role,
    })
    .from(files)
    .leftJoin(users, eq(users.id, files.uploadedById))
    .where(and(...conds))
    .orderBy(desc(files.createdAt));
}

export type FileListItem = Awaited<ReturnType<typeof listFiles>>[number];

export async function getFile(fileId: string) {
  const [row] = await db.select().from(files).where(eq(files.id, fileId));
  if (!row) throw notFound("File");
  return row;
}

export async function deleteFile(fileId: string) {
  const row = await getFile(fileId);
  await db.delete(files).where(eq(files.id, fileId));
  await storage().remove(row.storageKey).catch((e) => console.error("[files] storage remove failed", e));
  return row;
}

export async function moveFile(fileId: string, folder: string) {
  await db.update(files).set({ folder }).where(eq(files.id, fileId));
}

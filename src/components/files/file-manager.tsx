"use client";

import * as React from "react";
import { Download, ExternalLink, File, FileImage, FileText, FileVideo, Folder, FolderInput, MoreHorizontal, Trash2 } from "lucide-react";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/shared/layout";
import { Dropzone, type UploadTarget } from "./uploader";
import { useAction } from "@/hooks/use-action";
import { deleteFileAction, moveFileAction } from "@/server/actions/files";
import { formatBytes, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface FileItem {
  id: string;
  name: string;
  folder: string;
  mimeType: string;
  size: number;
  createdAt: string | Date;
  uploadedByName: string | null;
  uploadedByRole?: string | null;
  uploadedById?: string | null;
  projectName?: string | null;
}

export function fileIcon(mime: string) {
  if (mime.startsWith("image/")) return FileImage;
  if (mime.startsWith("video/")) return FileVideo;
  if (mime === "application/pdf" || mime.includes("word") || mime.startsWith("text/")) return FileText;
  return File;
}

const PREVIEWABLE = /^image\/(png|jpe?g|webp|gif|avif)$/;

export function FileTile({ f, onDelete, onMove, folders, canDelete }: { f: FileItem; onDelete?: () => void; onMove?: (folder: string) => void; folders?: readonly string[]; canDelete?: boolean }) {
  const Icon = fileIcon(f.mimeType);
  return (
    <div className="group relative overflow-hidden rounded-xl border border-line bg-white shadow-card transition hover:shadow-lift">
      <a href={`/api/files/${f.id}?inline=1`} target="_blank" rel="noreferrer" className="block">
        <div className="flex aspect-[4/3] items-center justify-center bg-cream/70">
          {PREVIEWABLE.test(f.mimeType) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/files/${f.id}?inline=1`} alt={f.name} className="size-full object-cover" loading="lazy" />
          ) : (
            <Icon className="size-9 text-subtle" strokeWidth={1.4} />
          )}
        </div>
      </a>
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-ink" title={f.name}>
            {f.name}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted">
            {formatBytes(f.size)} · {formatDate(f.createdAt, "d MMM")} · {f.uploadedByName ?? "—"}
          </p>
        </div>
        <Dropdown>
          <DropdownTrigger className="-mr-1 rounded-md p-1 text-muted opacity-70 hover:bg-cream hover:text-ink group-hover:opacity-100" aria-label="File actions">
            <MoreHorizontal className="size-4" />
          </DropdownTrigger>
          <DropdownContent>
            <DropdownItem asChild>
              <a href={`/api/files/${f.id}?inline=1`} target="_blank" rel="noreferrer">
                <ExternalLink /> Open
              </a>
            </DropdownItem>
            <DropdownItem asChild>
              <a href={`/api/files/${f.id}`}>
                <Download /> Download
              </a>
            </DropdownItem>
            {onMove && folders && (
              <>
                <DropdownSeparator />
                <DropdownLabel>Move to</DropdownLabel>
                {folders
                  .filter((x) => x !== f.folder)
                  .map((x) => (
                    <DropdownItem key={x} onSelect={() => onMove(x)}>
                      <FolderInput /> {x}
                    </DropdownItem>
                  ))}
              </>
            )}
            {canDelete && onDelete && (
              <>
                <DropdownSeparator />
                <DropdownItem destructive onSelect={onDelete}>
                  <Trash2 /> Delete
                </DropdownItem>
              </>
            )}
          </DropdownContent>
        </Dropdown>
      </div>
    </div>
  );
}

export function FileManager({
  files,
  folders,
  target,
  canManage,
  currentUserId,
  emptyText = "No files yet.",
}: {
  files: FileItem[];
  folders: readonly string[];
  target: UploadTarget;
  canManage: boolean;
  currentUserId: string;
  emptyText?: string;
}) {
  const allFolders = React.useMemo(() => Array.from(new Set([...folders, ...files.map((f) => f.folder)])), [folders, files]);
  const [folder, setFolder] = React.useState<string>("All");
  const visible = folder === "All" ? files : files.filter((f) => f.folder === folder);
  const del = useAction(deleteFileAction, { success: "File removed." });
  const move = useAction(moveFileAction, { success: "File moved." });

  return (
    <div className="grid gap-5 md:grid-cols-[200px_1fr]">
      <nav className="no-scrollbar flex gap-1 overflow-x-auto md:flex-col">
        {["All", ...allFolders].map((name) => {
          const count = name === "All" ? files.length : files.filter((f) => f.folder === name).length;
          return (
            <button
              key={name}
              onClick={() => setFolder(name)}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition",
                folder === name ? "bg-white font-medium text-ink shadow-card ring-1 ring-line" : "text-ink-soft hover:bg-cream-dark/60",
              )}
            >
              <Folder className={cn("size-4", folder === name ? "text-orange" : "text-subtle")} />
              <span className="flex-1 truncate">{name === "All" ? "All files" : `/${name}`}</span>
              <span className="text-xs text-subtle">{count}</span>
            </button>
          );
        })}
      </nav>
      <div className="space-y-4">
        <Dropzone target={{ ...target, folder: folder === "All" ? (target.folder ?? "Other") : folder }} hint={`Uploading to /${folder === "All" ? (target.folder ?? "Other") : folder} · Images, PDFs, documents, videos up to 25 MB`} compact />
        {visible.length === 0 ? (
          <EmptyState compact icon={<Folder />} title={folder === "All" ? emptyText : `/${folder} is empty`} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {visible.map((f) => (
              <FileTile
                key={f.id}
                f={f}
                folders={allFolders}
                canDelete={canManage || f.uploadedById === currentUserId}
                onDelete={() => {
                  if (confirm(`Delete ${f.name}? This can't be undone.`)) del.execute(f.id);
                }}
                onMove={canManage ? (to) => move.execute(f.id, to) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { FileUp } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { uploadFiles } from "@/components/files/uploader";
import { createDocumentAction } from "@/server/actions/files";
import { useAction } from "@/hooks/use-action";

export function UploadDocumentDialog({ clientId, projectId }: { clientId: string; projectId?: string }) {
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState("proposal");
  const [visible, setVisible] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const { execute, pending } = useAction(createDocumentAction, { success: "Document added.", onSuccess: () => setOpen(false) });

  const submit = async () => {
    if (!file) return toast.error("Choose a file to upload.");
    if (!name.trim()) return toast.error("Give the document a name.");
    setUploading(true);
    try {
      const [uploaded] = await uploadFiles([file], { clientId, projectId, folder: "Documents" });
      const fd = new FormData();
      fd.set("clientId", clientId);
      if (projectId) fd.set("projectId", projectId);
      fd.set("type", type);
      fd.set("name", name);
      fd.set("fileId", uploaded.id);
      if (visible) fd.set("clientVisible", "on");
      await execute(fd);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setFile(null);
          setName("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <FileUp /> Upload document
        </Button>
      </DialogTrigger>
      <DialogContent title="Upload document" description="Proposals, project briefs, signed contracts and other documents.">
        <div className="space-y-4">
          <Field label="File" required>
            <Input
              type="file"
              className="py-1.5"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !name) setName(f.name.replace(/\.[^.]+$/, ""));
              }}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Type">
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="proposal">Proposal</option>
                <option value="brief">Project Brief</option>
                <option value="receipt">Receipt</option>
                <option value="other">Other</option>
              </Select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="size-4" /> Visible to the client in their portal
          </label>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={submit} loading={uploading || pending} loadingText={uploading ? "Uploading…" : "Saving…"}>
              Upload
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

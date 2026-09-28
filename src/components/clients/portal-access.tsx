"use client";

import * as React from "react";
import { Copy, KeyRound, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/shared/action-form";
import { SubmitButton, TextField } from "@/components/shared/form-fields";
import { useAction } from "@/hooks/use-action";
import { createPortalUserAction, resetPortalPasswordAction } from "@/server/actions/clients";
import { timeAgo } from "@/lib/format";

function Credentials({ creds, onClose }: { creds: { email: string; password: string }; onClose: () => void }) {
  const text = `RQdinn Client Portal\nSign in: ${typeof window !== "undefined" ? window.location.origin : ""}/login\nEmail: ${creds.email}\nTemporary password: ${creds.password}`;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Share these details with the client securely (e.g. WhatsApp). The password is shown only once.</p>
      <pre className="whitespace-pre-wrap rounded-xl bg-cream p-4 font-mono text-[13px] text-ink">{text}</pre>
      <DialogFooter>
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              toast.success("Copied to clipboard");
            } catch {
              toast.error("Couldn't copy — please select and copy manually.");
            }
          }}
        >
          <Copy /> Copy
        </Button>
        <Button onClick={onClose}>Done</Button>
      </DialogFooter>
    </div>
  );
}

export function PortalAccess({
  clientId,
  users,
  defaultName,
  defaultEmail,
}: {
  clientId: string;
  users: { id: string; name: string; email: string; lastLoginAt: Date | string | null }[];
  defaultName?: string | null;
  defaultEmail?: string | null;
}) {
  const [open, setOpen] = React.useState(false);
  const [creds, setCreds] = React.useState<{ email: string; password: string } | null>(null);
  const reset = useAction(resetPortalPasswordAction, { onSuccess: (d) => setCreds(d) });

  return (
    <div className="space-y-3">
      {users.length ? (
        <ul className="space-y-2">
          {users.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-2 rounded-lg bg-cream/60 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{u.name}</p>
                <p className="truncate text-xs text-muted">
                  {u.email} · {u.lastLoginAt ? `Last seen ${timeAgo(u.lastLoginAt)}` : "Never signed in"}
                </p>
              </div>
              <Button size="icon-sm" variant="ghost" title="Reset password" loading={reset.pending} onClick={() => confirm(`Generate a new temporary password for ${u.name}?`) && reset.execute(clientId, u.id)}>
                <KeyRound />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No portal access yet.</p>
      )}
      <Dialog
        open={open || !!creds}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setCreds(null);
        }}
      >
        <DialogTrigger asChild>
          <Button size="sm" variant="secondary">
            <UserPlus /> Invite to portal
          </Button>
        </DialogTrigger>
        <DialogContent title={creds ? "Portal access ready" : "Invite to client portal"} description={creds ? undefined : "Creates a client login that can only see this company's projects."}>
          {creds ? (
            <Credentials
              creds={creds}
              onClose={() => {
                setCreds(null);
                setOpen(false);
              }}
            />
          ) : (
            <ActionForm action={createPortalUserAction.bind(null, clientId)} onSuccess={(d) => setCreds(d as { email: string; password: string })} className="space-y-4">
              <TextField name="name" label="Name" required defaultValue={defaultName ?? ""} />
              <TextField name="email" label="Email" type="email" required defaultValue={defaultEmail ?? ""} />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary">
                    Cancel
                  </Button>
                </DialogClose>
                <SubmitButton loadingText="Creating…">Create access</SubmitButton>
              </DialogFooter>
            </ActionForm>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

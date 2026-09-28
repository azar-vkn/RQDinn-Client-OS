"use client";

import * as React from "react";
import { toast } from "sonner";
import { Copy, RotateCcw, UserPlus } from "lucide-react";
import { ActionForm } from "@/components/shared/action-form";
import { SelectField, SubmitButton, TextAreaField, TextField } from "@/components/shared/form-fields";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/misc";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useAction } from "@/hooks/use-action";
import { changePasswordAction } from "@/server/actions/auth";
import { saveTemplateAction } from "@/server/actions/agreements";
import { createTeamMemberAction, resetDemoDataAction, saveAgencyAction, setUserActiveAction } from "@/server/actions/settings";
import type { AgencySettings } from "@/server/services/settings";
import { AGREEMENT_VARIABLES } from "@/lib/agreement-template";
import { timeAgo } from "@/lib/format";

export function AgencyForm({ agency, readOnly }: { agency: AgencySettings; readOnly: boolean }) {
  return (
    <ActionForm action={saveAgencyAction} className="space-y-4">
      <fieldset disabled={readOnly} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="name" label="Brand name" required defaultValue={agency.name} />
          <TextField name="legalName" label="Legal name" required defaultValue={agency.legalName} />
          <TextField name="tagline" label="Tagline" defaultValue={agency.tagline} />
          <TextField name="email" label="Email" type="email" required defaultValue={agency.email} />
          <TextField name="phone" label="Phone" defaultValue={agency.phone} />
          <TextField name="whatsapp" label="WhatsApp" defaultValue={agency.whatsapp} />
          <TextField name="gstin" label="GSTIN" defaultValue={agency.gstin} />
          <TextField name="upiId" label="UPI ID" defaultValue={agency.upiId} />
          <TextField name="invoicePrefix" label="Invoice prefix" required defaultValue={agency.invoicePrefix} hint="Invoices are numbered PREFIX-YEAR-001" />
        </div>
        <TextAreaField name="address" label="Address" rows={2} defaultValue={agency.address} />
        <TextAreaField name="bankDetails" label="Bank details (shown on invoices)" rows={3} defaultValue={agency.bankDetails} />
        <TextAreaField name="invoiceNotes" label="Default invoice notes" rows={2} defaultValue={agency.invoiceNotes} />
      </fieldset>
      {!readOnly && <SubmitButton>Save settings</SubmitButton>}
    </ActionForm>
  );
}

export function TeamSection({ users, isAdmin, currentUserId }: { users: { id: string; name: string; email: string; role: string; title: string | null; isActive: boolean; lastLoginAt: Date | string | null }[]; isAdmin: boolean; currentUserId: string }) {
  const [open, setOpen] = React.useState(false);
  const [creds, setCreds] = React.useState<{ email: string; password: string } | null>(null);
  const toggle = useAction(setUserActiveAction);
  return (
    <div className="space-y-4">
      <ul className="divide-y divide-line-soft rounded-xl border border-line">
        {users.map((u) => (
          <li key={u.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar name={u.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {u.name} {!u.isActive && <Badge tone="neutral" className="ml-1">Deactivated</Badge>}
              </p>
              <p className="truncate text-xs text-muted">
                {u.email} · {u.lastLoginAt ? `active ${timeAgo(u.lastLoginAt)}` : "never signed in"}
              </p>
            </div>
            <Badge tone={u.role === "admin" ? "orange" : "neutral"}>{u.role === "admin" ? "Admin" : u.title ?? "Team member"}</Badge>
            {isAdmin && u.id !== currentUserId && (
              <Button size="sm" variant="ghost" loading={toggle.pending} onClick={() => toggle.execute(u.id, !u.isActive)}>
                {u.isActive ? "Deactivate" : "Reactivate"}
              </Button>
            )}
          </li>
        ))}
      </ul>
      {isAdmin && (
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setCreds(null);
          }}
        >
          <DialogTrigger asChild>
            <Button variant="secondary" size="sm">
              <UserPlus /> Add team member
            </Button>
          </DialogTrigger>
          <DialogContent title={creds ? "Team member added" : "Add team member"}>
            {creds ? (
              <div className="space-y-4">
                <p className="text-sm text-muted">Share these sign-in details securely. The temporary password is shown once.</p>
                <pre className="rounded-xl bg-cream p-4 font-mono text-[13px]">{`Email: ${creds.email}\nTemporary password: ${creds.password}`}</pre>
                <DialogFooter>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      navigator.clipboard.writeText(`Email: ${creds.email}\nTemporary password: ${creds.password}`).then(
                        () => toast.success("Copied"),
                        () => toast.error("Couldn't copy"),
                      )
                    }
                  >
                    <Copy /> Copy
                  </Button>
                  <Button onClick={() => setOpen(false)}>Done</Button>
                </DialogFooter>
              </div>
            ) : (
              <ActionForm action={createTeamMemberAction} onSuccess={(d) => setCreds(d)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField name="name" label="Name" required />
                  <TextField name="email" label="Email" type="email" required />
                  <TextField name="title" label="Title" placeholder="Designer" />
                  <SelectField name="role" label="Role" options={[{ value: "team", label: "Team member" }, { value: "admin", label: "Admin" }]} />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">
                      Cancel
                    </Button>
                  </DialogClose>
                  <SubmitButton>Add member</SubmitButton>
                </DialogFooter>
              </ActionForm>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export function TemplateEditor({ templates, isAdmin }: { templates: { id: string; name: string; body: string; isDefault: boolean }[]; isAdmin: boolean }) {
  const [selected, setSelected] = React.useState(templates[0]?.id ?? "new");
  const t = templates.find((x) => x.id === selected);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {templates.map((x) => (
          <Button key={x.id} size="sm" variant={selected === x.id ? "dark" : "secondary"} onClick={() => setSelected(x.id)}>
            {x.name} {x.isDefault && "·  default"}
          </Button>
        ))}
        {isAdmin && (
          <Button size="sm" variant={selected === "new" ? "dark" : "ghost"} onClick={() => setSelected("new")}>
            + New template
          </Button>
        )}
      </div>
      <div className="rounded-xl bg-cream/70 p-3 text-xs text-muted">
        Variables: {AGREEMENT_VARIABLES.map((v) => `{{${v}}}`).join("  ")}
      </div>
      <ActionForm key={selected} action={saveTemplateAction} className="space-y-4">
        {t && <input type="hidden" name="id" value={t.id} />}
        <fieldset disabled={!isAdmin} className="space-y-4">
          <TextField name="name" label="Template name" required defaultValue={t?.name ?? ""} />
          <TextAreaField name="body" label="Body" required rows={18} defaultValue={t?.body ?? ""} className="font-serif" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isDefault" defaultChecked={t?.isDefault ?? false} className="size-4" /> Default template
          </label>
        </fieldset>
        {isAdmin && <SubmitButton>Save template</SubmitButton>}
      </ActionForm>
    </div>
  );
}

export function PasswordForm() {
  return (
    <ActionForm action={changePasswordAction} resetOnSuccess className="max-w-md space-y-4">
      <TextField name="current" label="Current password" type="password" autoComplete="current-password" required />
      <TextField name="next" label="New password" type="password" autoComplete="new-password" required hint="At least 8 characters." />
      <TextField name="confirm" label="Confirm new password" type="password" autoComplete="new-password" required />
      <SubmitButton>Update password</SubmitButton>
    </ActionForm>
  );
}

export function DemoReset() {
  const reset = useAction(resetDemoDataAction);
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        loading={reset.pending}
        onClick={() => confirm("Reset ALL data to the demo state? Everything you created will be deleted and you'll be signed out.") && reset.execute(false)}
      >
        <RotateCcw /> Reset demo data
      </Button>
      <Button
        variant="secondary"
        loading={reset.pending}
        onClick={() => confirm("Reset to demo data WITHOUT D'PARKZ, so you can create it live from scratch? Everything else is deleted and you'll be signed out.") && reset.execute(true)}
      >
        <RotateCcw /> Reset — start D&apos;PARKZ from scratch
      </Button>
    </div>
  );
}

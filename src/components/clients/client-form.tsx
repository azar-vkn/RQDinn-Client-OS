"use client";

import { useRouter } from "next/navigation";
import { ActionForm } from "@/components/shared/action-form";
import { SelectField, SubmitButton, TextAreaField, TextField } from "@/components/shared/form-fields";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CLIENT_STATUS_LABEL, CLIENT_STATUSES, INDUSTRIES } from "@/lib/constants";
import { createClientAction, updateClientAction } from "@/server/actions/clients";
import type { ActionResult } from "@/server/actions/run";

export interface ClientFormValues {
  id?: string;
  companyName?: string;
  industry?: string;
  status?: string;
  address?: string | null;
  city?: string | null;
  website?: string | null;
  googleBusinessUrl?: string | null;
  instagram?: string | null;
  notes?: string | null;
  assignedToId?: string | null;
  contact?: { name?: string | null; role?: string | null; phone?: string | null; email?: string | null; whatsapp?: string | null };
}

export function ClientForm({ values = {}, staff, onDone }: { values?: ClientFormValues; staff: { id: string; name: string }[]; onDone?: () => void }) {
  const router = useRouter();
  const editing = Boolean(values.id);
  const action = (editing ? updateClientAction.bind(null, values.id!) : createClientAction) as (fd: FormData) => Promise<ActionResult<unknown>>;

  return (
    <ActionForm
      action={action}
      onSuccess={(data) => {
        onDone?.();
        if (!editing && data && typeof data === "object" && "id" in data) router.push(`/clients/${(data as { id: string }).id}`);
      }}
      className="space-y-6"
    >
      <section className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Company</p>
        <TextField name="companyName" label="Company name" required defaultValue={values.companyName} placeholder="e.g. D'PARKZ" autoFocus />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField name="industry" label="Industry" options={INDUSTRIES} defaultValue={values.industry ?? "restaurant"} />
          <SelectField name="status" label="Status" options={CLIENT_STATUSES.map((s) => ({ value: s, label: CLIENT_STATUS_LABEL[s] }))} defaultValue={values.status ?? "lead"} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="address" label="Address" defaultValue={values.address ?? ""} />
          <TextField name="city" label="City" defaultValue={values.city ?? ""} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField name="website" label="Website" defaultValue={values.website ?? ""} placeholder="example.com" />
          <TextField name="googleBusinessUrl" label="Google Business Profile" defaultValue={values.googleBusinessUrl ?? ""} placeholder="g.page/…" />
          <TextField name="instagram" label="Instagram" defaultValue={values.instagram ?? ""} placeholder="instagram.com/…" />
        </div>
      </section>
      <section className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Primary contact</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="contactName" label="Contact person" required defaultValue={values.contact?.name ?? ""} />
          <TextField name="contactRole" label="Role" defaultValue={values.contact?.role ?? ""} placeholder="Owner" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField name="contactPhone" label="Phone" type="tel" defaultValue={values.contact?.phone ?? ""} placeholder="+91 XXXXX XXXXX" />
          <TextField name="contactWhatsapp" label="WhatsApp" type="tel" defaultValue={values.contact?.whatsapp ?? ""} placeholder="+91 XXXXX XXXXX" />
          <TextField name="contactEmail" label="Email" type="email" defaultValue={values.contact?.email ?? ""} />
        </div>
      </section>
      <section className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Internal</p>
        <SelectField name="assignedToId" label="Assigned team member" options={staff.map((s) => ({ value: s.id, label: s.name }))} placeholder="Unassigned" defaultValue={values.assignedToId ?? ""} />
        <TextAreaField name="notes" label="Notes" defaultValue={values.notes ?? ""} rows={3} placeholder="Anything the team should know…" />
      </section>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="secondary">
            Cancel
          </Button>
        </DialogClose>
        <SubmitButton loadingText={editing ? "Saving…" : "Creating…"}>{editing ? "Save changes" : "Create client"}</SubmitButton>
      </DialogFooter>
    </ActionForm>
  );
}

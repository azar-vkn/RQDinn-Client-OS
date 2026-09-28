"use client";

import * as React from "react";
import { Pencil } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/shared/action-form";
import { SelectField, SubmitButton, TextAreaField, TextField } from "@/components/shared/form-fields";
import { updateProjectAction } from "@/server/actions/projects";
import { paiseToRupees, toDateInput } from "@/lib/format";

export function EditProjectButton({
  projectId,
  staff,
  values,
}: {
  projectId: string;
  staff: { id: string; name: string }[];
  values: { name: string; description: string | null; value: number; annualValue: number; assignedToId: string | null; startDate: string | null; dueDate: string | null; phase: string };
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Pencil /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent title="Edit project" size="lg">
        <ActionForm action={updateProjectAction.bind(null, projectId)} onSuccess={() => setOpen(false)} className="space-y-4">
          <TextField name="name" label="Project name" required defaultValue={values.name} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="value" label="Project value (₹)" inputMode="decimal" defaultValue={paiseToRupees(values.value)} hint="Doesn't change the existing payment schedule." />
            <TextField name="annualValue" label="Annual (₹)" inputMode="decimal" defaultValue={paiseToRupees(values.annualValue)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField name="assignedToId" label="Project lead" placeholder="Unassigned" options={staff.map((s) => ({ value: s.id, label: s.name }))} defaultValue={values.assignedToId ?? ""} />
            <TextField name="startDate" label="Start date" type="date" defaultValue={toDateInput(values.startDate)} />
            <TextField name="dueDate" label="Target launch" type="date" defaultValue={toDateInput(values.dueDate)} />
          </div>
          <SelectField
            name="phase"
            label="Project status"
            defaultValue={values.phase}
            options={[
              { value: "active", label: "Active" },
              { value: "on_hold", label: "On hold" },
              { value: "live", label: "Live" },
              { value: "maintenance", label: "Maintenance" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
          <TextAreaField name="description" label="Scope / description" rows={4} defaultValue={values.description ?? ""} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <SubmitButton>Save changes</SubmitButton>
          </DialogFooter>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

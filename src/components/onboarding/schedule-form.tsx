"use client";

import { ActionForm } from "@/components/shared/action-form";
import { SelectField, SubmitButton, TextField } from "@/components/shared/form-fields";
import { scheduleOnboardingAction } from "@/server/actions/projects";
import { toDateTimeInput } from "@/lib/format";

/** Manual scheduling today; designed to sync with Google Calendar later (projects.calendar_event_id). */
export function ScheduleForm({
  projectId,
  at,
  link,
  assigneeId,
  staff,
}: {
  projectId: string;
  at: Date | string | null;
  link: string | null;
  assigneeId: string | null;
  staff: { id: string; name: string }[];
}) {
  return (
    <ActionForm action={scheduleOnboardingAction.bind(null, projectId)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="onboardingAt" label="Date & time" type="datetime-local" defaultValue={toDateTimeInput(at)} />
        <SelectField name="onboardingAssigneeId" label="Host" placeholder="Unassigned" options={staff.map((s) => ({ value: s.id, label: s.name }))} defaultValue={assigneeId ?? ""} />
      </div>
      <TextField name="onboardingMeetingLink" label="Meeting link" placeholder="https://meet.google.com/…" defaultValue={link ?? ""} hint="Google Calendar sync can be enabled later in Settings → Integrations." />
      <SubmitButton variant="secondary">Save schedule</SubmitButton>
    </ActionForm>
  );
}

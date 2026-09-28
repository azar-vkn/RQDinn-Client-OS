"use client";

import { ActionForm } from "@/components/shared/action-form";
import { SubmitButton, TextAreaField } from "@/components/shared/form-fields";
import { contactRqdinnAction } from "@/server/actions/portal";

export function ContactForm({ projectId }: { projectId: string }) {
  return (
    <ActionForm action={contactRqdinnAction} resetOnSuccess className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      <TextAreaField name="message" label="Message" required rows={6} placeholder="How can we help?" />
      <SubmitButton loadingText="Sending…">Send message</SubmitButton>
    </ActionForm>
  );
}

"use client";

import { ActionForm } from "@/components/shared/action-form";
import { SubmitButton, TextField } from "@/components/shared/form-fields";
import { acceptAgreementAction } from "@/server/actions/agreements";

export function AcceptAgreementForm({ agreementId, defaultName }: { agreementId: string; defaultName: string }) {
  return (
    <ActionForm action={acceptAgreementAction.bind(null, agreementId)} className="space-y-4">
      <TextField name="name" label="Your full name" required defaultValue={defaultName} />
      <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-cream/70 p-4 text-sm leading-relaxed">
        <input type="checkbox" name="confirm" className="mt-0.5 size-5" />
        <span>I have read this agreement and accept its terms on behalf of my business.</span>
      </label>
      <SubmitButton size="lg" variant="success" className="w-full sm:w-auto" loadingText="Accepting…">
        Accept agreement
      </SubmitButton>
      <p className="text-xs text-muted">We record your name, the date and time, and your IP address as confirmation of acceptance.</p>
    </ActionForm>
  );
}

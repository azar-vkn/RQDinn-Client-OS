"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileSignature, Plus, Send } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { ActionForm } from "@/components/shared/action-form";
import { SelectField, SubmitButton, TextAreaField, TextField } from "@/components/shared/form-fields";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/layout";
import { useAction } from "@/hooks/use-action";
import { generateAgreementAction, sendAgreementAction } from "@/server/actions/agreements";
import { formatDate } from "@/lib/format";

export interface AgreementView {
  id: string;
  title: string;
  status: string;
  createdAt: Date | string;
  sentAt: Date | string | null;
  acceptedAt: Date | string | null;
  acceptedName: string | null;
}

export function GenerateAgreementDialog({
  projectId,
  templates,
  defaults,
  trigger,
}: {
  projectId: string;
  templates: { id: string; name: string; isDefault: boolean }[];
  defaults: Record<string, string>;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus /> Generate agreement
          </Button>
        )}
      </DialogTrigger>
      <DialogContent title="Generate agreement" description="Variables are filled from the project. Adjust anything before generating." size="lg">
        {templates.length === 0 ? (
          <EmptyState compact title="No agreement templates" description="Create one in Settings → Agreement templates." />
        ) : (
          <ActionForm
            action={generateAgreementAction.bind(null, projectId)}
            onSuccess={(d) => {
              setOpen(false);
              router.push(`/agreements/${(d as { id: string }).id}`);
            }}
            className="space-y-4"
          >
            <SelectField name="templateId" label="Template" options={templates.map((t) => ({ value: t.id, label: t.name + (t.isDefault ? " (default)" : "") }))} defaultValue={templates.find((t) => t.isDefault)?.id ?? templates[0].id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="CLIENT_NAME" label="{{CLIENT_NAME}}" defaultValue={defaults.CLIENT_NAME} />
              <TextField name="PROJECT_NAME" label="{{PROJECT_NAME}}" defaultValue={defaults.PROJECT_NAME} />
              <TextField name="PROJECT_PRICE" label="{{PROJECT_PRICE}}" defaultValue={defaults.PROJECT_PRICE} />
              <TextField name="ANNUAL_PRICE" label="{{ANNUAL_PRICE}}" defaultValue={defaults.ANNUAL_PRICE} />
              <TextField name="START_DATE" label="{{START_DATE}}" defaultValue={defaults.START_DATE} />
              <TextField name="AGENCY_NAME" label="{{AGENCY_NAME}}" defaultValue={defaults.AGENCY_NAME} />
            </div>
            <TextAreaField name="PAYMENT_TERMS" label="{{PAYMENT_TERMS}}" rows={4} defaultValue={defaults.PAYMENT_TERMS} />
            <TextAreaField name="DELIVERY_SCOPE" label="{{DELIVERY_SCOPE}}" rows={5} defaultValue={defaults.DELIVERY_SCOPE} />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <SubmitButton loadingText="Generating…">Generate agreement</SubmitButton>
            </DialogFooter>
          </ActionForm>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AgreementsPanel({
  projectId,
  agreements,
  templates,
  defaults,
}: {
  projectId: string;
  agreements: AgreementView[];
  templates: { id: string; name: string; isDefault: boolean }[];
  defaults: Record<string, string>;
}) {
  const send = useAction(sendAgreementAction);
  return (
    <Card>
      <CardHeader title="Agreements" description="Generated from templates with project variables." action={<GenerateAgreementDialog projectId={projectId} templates={templates} defaults={defaults} />} />
      {agreements.length ? (
        <ul className="divide-y divide-line-soft">
          {agreements.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <span className="flex size-9 items-center justify-center rounded-lg bg-cream text-muted">
                <FileSignature className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <Link href={`/agreements/${a.id}`} className="text-sm font-medium text-ink hover:text-orange-dark">
                  {a.title}
                </Link>
                <p className="text-xs text-muted">
                  Created {formatDate(a.createdAt)}
                  {a.sentAt ? ` · Sent ${formatDate(a.sentAt)}` : ""}
                  {a.acceptedAt ? ` · Accepted ${formatDate(a.acceptedAt)} by ${a.acceptedName}` : ""}
                </p>
              </div>
              <StatusBadge kind="agreement" value={a.status} />
              {a.status === "draft" && (
                <Button size="sm" variant="secondary" loading={send.pending} onClick={() => send.execute(a.id)}>
                  <Send /> Send to client
                </Button>
              )}
              <Button size="sm" variant="ghost" asChild>
                <Link href={`/agreements/${a.id}`}>Open</Link>
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState compact icon={<FileSignature />} title="No agreement yet" description="Generate the agreement to move this project forward." />
      )}
    </Card>
  );
}

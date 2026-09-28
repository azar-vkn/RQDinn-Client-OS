"use client";

import * as React from "react";
import { Download, FileSignature, Pencil, Save, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { ActionForm } from "@/components/shared/action-form";
import { SubmitButton, TextField } from "@/components/shared/form-fields";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAction } from "@/hooks/use-action";
import { recordSignedAgreementAction, sendAgreementAction, updateAgreementBodyAction } from "@/server/actions/agreements";
import { formatDateTime } from "@/lib/format";

export interface AgreementData {
  id: string;
  title: string;
  body: string;
  status: string;
  sentAt: Date | string | null;
  acceptedAt: Date | string | null;
  acceptedName: string | null;
  acceptedIp: string | null;
  clientName: string;
}

export function AgreementPaper({ a }: { a: AgreementData }) {
  return (
    <Card className="mx-auto max-w-3xl p-6 sm:p-12 print:border-0 print:shadow-none">
      <div className="mb-8 flex items-center justify-between">
        <p className="text-lg font-semibold tracking-[0.22em]">RQDINN</p>
        <StatusBadge kind="agreement" value={a.status} />
      </div>
      <div className="whitespace-pre-wrap font-serif text-[15px] leading-[1.8] text-ink">{a.body}</div>
      {a.acceptedAt && (
        <div className="mt-10 flex gap-3 rounded-xl bg-green-soft p-4 text-sm">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-green" />
          <div>
            <p className="font-medium">Accepted by {a.acceptedName}</p>
            <p className="text-xs text-muted">
              {formatDateTime(a.acceptedAt)}
              {a.acceptedIp && a.acceptedIp !== "demo" ? ` · IP ${a.acceptedIp}` : ""}
            </p>
            <p className="mt-1 text-[11px] text-muted">Click-through acknowledgement recorded in RQdinn Client OS. Not a digital signature.</p>
          </div>
        </div>
      )}
    </Card>
  );
}

export function AgreementAdminView({ a }: { a: AgreementData }) {
  const [editing, setEditing] = React.useState(false);
  const [body, setBody] = React.useState(a.body);
  const [signedOpen, setSignedOpen] = React.useState(false);
  const save = useAction(updateAgreementBodyAction, { onSuccess: () => setEditing(false) });
  const send = useAction(sendAgreementAction);

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center gap-2">
        <Button variant="secondary" asChild>
          <a href={`/api/pdf/agreement/${a.id}`}>
            <Download /> Download PDF
          </a>
        </Button>
        {a.status === "draft" &&
          (editing ? (
            <Button variant="secondary" loading={save.pending} onClick={() => save.execute(a.id, body)}>
              <Save /> Save changes
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil /> Edit text
            </Button>
          ))}
        {a.status !== "accepted" && (
          <Button loading={send.pending} onClick={() => send.execute(a.id)} disabled={editing}>
            <Send /> {a.status === "sent" ? "Resend to client" : "Send to client"}
          </Button>
        )}
        {a.status !== "accepted" && (
          <Dialog open={signedOpen} onOpenChange={setSignedOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary">
                <FileSignature /> Record signed copy
              </Button>
            </DialogTrigger>
            <DialogContent title="Record signed agreement" description="Use when the client signed a printed or PDF copy. Upload the signed file under Documents.">
              <ActionForm action={recordSignedAgreementAction.bind(null, a.id)} onSuccess={() => setSignedOpen(false)} className="space-y-4">
                <TextField name="name" label="Signed by" required defaultValue="" placeholder="Client's full name" />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">
                      Cancel
                    </Button>
                  </DialogClose>
                  <SubmitButton variant="success">Mark accepted</SubmitButton>
                </DialogFooter>
              </ActionForm>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <p className="no-print text-xs text-muted">
        E-signatures aren&apos;t enabled yet. Clients accept with a recorded click-through acknowledgement; a legally binding e-sign provider can be connected later.
      </p>
      {editing ? (
        <Card className="mx-auto max-w-3xl p-4">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[70vh] font-serif text-[15px] leading-relaxed" />
        </Card>
      ) : (
        <AgreementPaper a={a} />
      )}
    </div>
  );
}

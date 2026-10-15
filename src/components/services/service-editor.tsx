"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { useAction } from "@/hooks/use-action";
import { deleteServiceAction, saveServiceAction } from "@/server/actions/catalog";
import type { CatalogService } from "@/server/services/catalog";
import { paiseToRupees } from "@/lib/format";
import { SERVICE_BILLINGS, SERVICE_BILLING_LABEL, type ServiceBillingValue } from "@/lib/constants";

export function ServiceEditor({ service, categories, onDone }: { service: CatalogService | null; categories: string[]; onDone: () => void }) {
  const [name, setName] = React.useState(service?.name ?? "");
  const [price, setPrice] = React.useState(service ? paiseToRupees(service.price) : "");
  const [billing, setBilling] = React.useState<ServiceBillingValue>(service?.billing ?? "one_time");
  const [category, setCategory] = React.useState(service?.category ?? "");
  const [description, setDescription] = React.useState(service?.description ?? "");
  const [features, setFeatures] = React.useState(service?.features.join("\n") ?? "");
  const [isActive, setIsActive] = React.useState(service?.isActive ?? true);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const save = useAction(saveServiceAction, { onSuccess: onDone });
  const remove = useAction(deleteServiceAction, { onSuccess: onDone });
  const busy = save.pending || remove.pending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await save.execute(service?.id ?? null, { name, price, billing, category, description, features: features.split("\n"), isActive });
    setErrors(res.ok ? {} : res.fieldErrors ?? {});
  };

  return (
    <DialogContent title={service ? "Edit service" : "Add service"} size="lg">
      <form onSubmit={submit} noValidate>
        <fieldset disabled={busy} className="m-0 min-w-0 space-y-4 border-0 p-0">
          <Field label="Service name" htmlFor="svc-name" required error={errors.name}>
            <Input id="svc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Website Development" aria-invalid={!!errors.name || undefined} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Price (₹)" htmlFor="svc-price" required error={errors.price}>
              <Input id="svc-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 25000" aria-invalid={!!errors.price || undefined} />
            </Field>
            <Field label="Billing" htmlFor="svc-billing">
              <Select id="svc-billing" value={billing} onChange={(e) => setBilling(e.target.value as ServiceBillingValue)}>
                {SERVICE_BILLINGS.map((b) => (
                  <option key={b} value={b}>
                    {SERVICE_BILLING_LABEL[b]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Category" htmlFor="svc-category" hint="Optional. Groups services on the page." error={errors.category}>
            <Input id="svc-category" list="svc-categories" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Development, Marketing" />
            <datalist id="svc-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Description" htmlFor="svc-description" error={errors.description}>
            <Textarea id="svc-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="min-h-0" placeholder="Optional" />
          </Field>
          <Field label="What's included (one per line)" htmlFor="svc-features" error={errors.features} hint="Optional.">
            <Textarea id="svc-features" value={features} onChange={(e) => setFeatures(e.target.value)} rows={4} placeholder={"5 pages\nMobile friendly\nContact form"} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="size-4" />
            Show in quotes (untick to hide without deleting)
          </label>

          <DialogFooter className="sm:justify-between">
            {service ? (
              <Button
                type="button"
                variant="danger-ghost"
                loading={remove.pending}
                loadingText="Deleting…"
                onClick={() => confirm(`Delete "${service.name}"? This can't be undone.`) && remove.execute(service.id)}
              >
                <Trash2 /> Delete
              </Button>
            ) : (
              <span className="hidden sm:block" />
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" loading={save.pending} loadingText="Saving…">
                Save service
              </Button>
            </div>
          </DialogFooter>
        </fieldset>
      </form>
    </DialogContent>
  );
}

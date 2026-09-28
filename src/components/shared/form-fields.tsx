"use client";

import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { useFieldError, useFormPending } from "./action-form";

type Common = { name: string; label?: React.ReactNode; hint?: React.ReactNode; required?: boolean; className?: string };

export function TextField({ name, label, hint, required, className, ...props }: Common & React.InputHTMLAttributes<HTMLInputElement>) {
  const error = useFieldError(name);
  return (
    <Field label={label} htmlFor={name} hint={hint} error={error} required={required} className={className}>
      <Input id={name} name={name} aria-invalid={!!error || undefined} {...props} />
    </Field>
  );
}

export function TextAreaField({ name, label, hint, required, className, ...props }: Common & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const error = useFieldError(name);
  return (
    <Field label={label} htmlFor={name} hint={hint} error={error} required={required} className={className}>
      <Textarea id={name} name={name} aria-invalid={!!error || undefined} {...props} />
    </Field>
  );
}

export function SelectField({
  name,
  label,
  hint,
  required,
  className,
  options,
  placeholder,
  ...props
}: Common & React.SelectHTMLAttributes<HTMLSelectElement> & { options: readonly { value: string; label: string }[]; placeholder?: string }) {
  const error = useFieldError(name);
  return (
    <Field label={label} htmlFor={name} hint={hint} error={error} required={required} className={className}>
      <Select id={name} name={name} aria-invalid={!!error || undefined} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}

export function SubmitButton({ children, loadingText, ...props }: ButtonProps) {
  const pending = useFormPending();
  return (
    <Button type="submit" loading={pending} loadingText={loadingText ?? "Saving…"} {...props}>
      {children}
    </Button>
  );
}

"use client";

import * as React from "react";
import { useAction } from "@/hooks/use-action";
import type { ActionResult } from "@/server/actions/run";
import { cn } from "@/lib/utils";

type FieldErrors = Record<string, string>;
const ErrorsContext = React.createContext<FieldErrors>({});
const PendingContext = React.createContext(false);

/** Read the inline error for a field inside an <ActionForm>. */
export const useFieldError = (name: string) => React.useContext(ErrorsContext)[name] ?? null;
export const useFormPending = () => React.useContext(PendingContext);

/**
 * Form wrapper around a server action. Entered values are preserved when the
 * action fails (we never reset on error) and field errors are shown inline.
 */
export function ActionForm<T>({
  action,
  children,
  success,
  onSuccess,
  resetOnSuccess,
  className,
  id,
}: {
  action: (fd: FormData) => Promise<ActionResult<T>>;
  children: React.ReactNode;
  success?: string | false;
  onSuccess?: (data: T) => void;
  resetOnSuccess?: boolean;
  className?: string;
  id?: string;
}) {
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const ref = React.useRef<HTMLFormElement>(null);
  const { execute, pending } = useAction(action, {
    success,
    onSuccess: (data) => {
      setErrors({});
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.(data);
    },
  });

  return (
    <ErrorsContext.Provider value={errors}>
      <PendingContext.Provider value={pending}>
        <form
          id={id}
          ref={ref}
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await execute(new FormData(e.currentTarget));
            if (!res.ok) setErrors(res.fieldErrors ?? {});
          }}
        >
          {/* The fieldset carries the layout classes so spacing utilities apply to the fields. */}
          <fieldset disabled={pending} className={cn("m-0 min-w-0 border-0 p-0", className)}>
            {children}
          </fieldset>
        </form>
      </PendingContext.Provider>
    </ErrorsContext.Provider>
  );
}

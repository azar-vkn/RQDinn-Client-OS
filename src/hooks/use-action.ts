"use client";

import { useCallback, useRef, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/server/actions/run";

/**
 * Run a server action with a pending state and toast feedback.
 * Errors are always surfaced — never silent.
 */
export function useAction<A extends unknown[], T>(
  action: (...args: A) => Promise<ActionResult<T>>,
  opts: { success?: string | ((data: T) => string) | false; onSuccess?: (data: T) => void | Promise<void>; onError?: (error: string) => void } = {},
) {
  const [pending, startTransition] = useTransition();
  // Always call the latest callbacks (they often close over component state).
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const execute = useCallback(
    (...args: A) =>
      new Promise<ActionResult<T>>((resolve) => {
        startTransition(async () => {
          let res: ActionResult<T>;
          try {
            res = await action(...args);
          } catch (err) {
            console.error(err);
            res = { ok: false, error: "Network error — please check your connection and try again." };
          }
          const o = optsRef.current;
          if (res.ok) {
            const msg = typeof o.success === "function" ? o.success(res.data) : o.success ?? res.message;
            if (msg) toast.success(msg);
            await o.onSuccess?.(res.data);
          } else {
            toast.error(res.error);
            o.onError?.(res.error);
          }
          resolve(res);
        });
      }),
    [action],
  );
  return { execute, pending };
}

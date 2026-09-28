"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-danger-soft text-danger">
        <AlertTriangle className="size-6" />
      </span>
      <h1 className="mt-5 font-serif text-2xl font-medium">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">We couldn&apos;t load this page. Please try again — if it keeps happening, let the team know.</p>
      {error.digest && <p className="mt-2 font-mono text-[11px] text-subtle">Ref: {error.digest}</p>}
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}

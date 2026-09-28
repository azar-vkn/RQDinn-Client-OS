"use client";

import { useActionState, useRef } from "react";
import { AlertCircle, ArrowRight } from "lucide-react";
import { loginAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@rqdinn.demo", hint: "Full access" },
  { label: "Team member", email: "aisha@rqdinn.demo", hint: "Assigned projects" },
  { label: "Client · D'PARKZ", email: "owner@dparkz.demo", hint: "Client portal" },
  { label: "Client · GreenLeaf", email: "arjun@greenleaf.demo", hint: "Live + maintenance" },
];

export function LoginForm({ next, demoPassword }: { next: string; demoPassword: string | null }) {
  const [state, action, pending] = useActionState(loginAction, {});
  const emailRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <form ref={formRef} action={action} className="mt-8 space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />
        <Field label="Email" htmlFor="email">
          <Input ref={emailRef} id="email" name="email" type="email" autoComplete="email" defaultValue={state.email} required className="h-11" placeholder="you@rqdinn.com" />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input ref={pwRef} id="password" name="password" type="password" autoComplete="current-password" required className="h-11" />
        </Field>
        {state.error && (
          <div className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2.5 text-sm text-danger" role="alert">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {state.error}
          </div>
        )}
        <Button type="submit" size="lg" className="w-full" loading={pending} loadingText="Signing in…">
          Sign in <ArrowRight />
        </Button>
      </form>

      {demoPassword && (
        <div className="mt-10 rounded-2xl border border-dashed border-line bg-white/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Demo accounts</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                disabled={pending}
                onClick={() => {
                  if (emailRef.current && pwRef.current) {
                    emailRef.current.value = a.email;
                    pwRef.current.value = demoPassword;
                    formRef.current?.requestSubmit();
                  }
                }}
                className="rounded-xl border border-line bg-white px-3 py-2.5 text-left transition hover:border-orange-light hover:shadow-card"
              >
                <span className="block text-[13px] font-medium text-ink">{a.label}</span>
                <span className="block text-[11px] text-muted">{a.hint}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-subtle">Visible because DEMO_MODE is on. Disable it in production.</p>
        </div>
      )}
    </>
  );
}

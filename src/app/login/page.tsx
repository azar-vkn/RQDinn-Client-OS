import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/server/auth/session";
import { LoginForm } from "./login-form";
import { Wordmark } from "@/components/shared/brand";
import { DEMO_PASSWORD } from "@/server/db/demo";
import { isDemoMode } from "@/server/demo-mode";

export const metadata = { title: "Sign in" };

export default async function LoginPage(props: PageProps<"/login">) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : "";
  const demo = isDemoMode();
  const demoPassword = demo ? DEMO_PASSWORD : null;

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-ink p-12 text-cream lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 size-[420px] rounded-full bg-orange/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 size-[380px] rounded-full bg-green/20 blur-3xl" />
        <div className="relative flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-[10px] bg-cream text-ink">
            <svg viewBox="0 0 24 24" className="size-5" fill="none">
              <path d="M6 19V5h6.2a4.3 4.3 0 0 1 0 8.6H6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="m12.5 13.6 5 5.4" stroke="#D97757" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </span>
          <span className="text-sm font-semibold tracking-[0.2em]">RQDINN</span>
        </div>
        <div className="relative max-w-md">
          <p className="font-serif text-[44px] font-light leading-[1.08] tracking-tight">
            Build. Manage. <span className="italic text-orange-light">Deliver.</span>
          </p>
          <p className="mt-5 text-[15px] leading-relaxed text-cream/70">
            Every client, agreement, payment, onboarding call, review and launch — run from one calm place.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-3 text-xs text-cream/60">
            {["Lead", "Onboarding", "Development", "Review", "Launch", "Maintenance"].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <span className={`size-1.5 rounded-full ${i < 4 ? "bg-orange" : "bg-green"}`} />
                {s}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-cream/40">RQdinn Client OS · Internal agency platform</p>
      </aside>
      <main className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm animate-rise">
          <Wordmark className="mb-10 lg:hidden" />
          <h1 className="font-serif text-3xl font-medium tracking-tight">Welcome back</h1>
          <p className="mt-2 text-[15px] text-muted">Sign in to your RQdinn workspace.</p>
          <LoginForm next={next} demoPassword={demoPassword} />
        </div>
      </main>
    </div>
  );
}

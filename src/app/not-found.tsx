import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/shared/brand";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <LogoMark className="size-10" />
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-orange">404</p>
      <h1 className="mt-2 font-serif text-3xl font-medium">We couldn&apos;t find that page</h1>
      <p className="mt-2 max-w-sm text-muted">It may have moved, or you might not have access to it.</p>
      <Button className="mt-6" asChild>
        <Link href="/">Back to RQdinn</Link>
      </Button>
    </div>
  );
}

import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { normalizeUrl } from "@/lib/validators";
import { mshotsUrl } from "@/lib/screenshot";

export const maxDuration = 30;

const ATTEMPTS = 8;
const WAIT_MS = 3000;

/**
 * Hero screenshot of a website. mShots replies with a redirect to a
 * "Generating Preview" image until the capture exists, so poll until it
 * returns the real JPEG/PNG and only then hand it to the browser.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const target = normalizeUrl(req.nextUrl.searchParams.get("url") ?? "");
  if (!target) return new NextResponse("Invalid url", { status: 400 });

  const source = mshotsUrl(target);
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, WAIT_MS));
    try {
      const res = await fetch(source, { redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(10_000) });
      const type = res.headers.get("content-type") ?? "";
      if (res.ok && /^image\/(jpeg|png|webp)/.test(type)) {
        const body = new Uint8Array(await res.arrayBuffer());
        return new NextResponse(body, {
          headers: {
            "Content-Type": type,
            "Content-Length": String(body.length),
            "Cache-Control": "private, max-age=86400",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
      await res.body?.cancel().catch(() => {});
    } catch {
      // try again
    }
  }
  return new NextResponse("Screenshot not ready yet", { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "10" } });
}

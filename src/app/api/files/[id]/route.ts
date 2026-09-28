import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { assertClientAccess, assertProjectAccess } from "@/server/auth/permissions";
import { getFile, INLINE_MIME } from "@/server/services/files";
import { storage } from "@/server/integrations/storage";
import { AppError } from "@/server/errors";

/** Authorised file download. Files are never publicly addressable. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/files/[id]">) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  try {
    const file = await getFile(id);
    if (file.projectId) await assertProjectAccess(user, file.projectId);
    else await assertClientAccess(user, file.clientId);
    const data = await storage().get(file.storageKey);
    const inline = req.nextUrl.searchParams.get("inline") === "1" && INLINE_MIME.test(file.mimeType);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": inline ? file.mimeType : "application/octet-stream",
        "Content-Length": String(data.length),
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox",
      },
    });
  } catch (err) {
    if (err instanceof AppError) return new NextResponse(err.message, { status: err.code === "forbidden" ? 403 : 404 });
    console.error("[files]", err);
    return new NextResponse("File unavailable.", { status: 500 });
  }
}

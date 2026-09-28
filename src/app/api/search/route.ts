import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { isStaff } from "@/server/auth/permissions";
import { globalSearch } from "@/server/services/dashboard";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 100);
  try {
    return NextResponse.json({ results: await globalSearch(user, q) });
  } catch (err) {
    console.error("[search]", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

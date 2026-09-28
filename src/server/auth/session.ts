import crypto from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, lt } from "drizzle-orm";
import { db, dbReady } from "@/server/db/client";
import { sessions, users, type UserRole } from "@/server/db/schema";
import { AppError } from "@/server/errors";

export const SESSION_COOKIE = "rq_session";

export interface Actor {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string | null;
  clientId: string | null;
}

const ttlDays = () => Number(process.env.SESSION_TTL_DAYS || 14);
const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string) {
  await dbReady();
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ttlDays() * 86_400_000);
  const ua = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  await db.insert(sessions).values({ userId, tokenHash: hashToken(token), expiresAt, userAgent: ua });
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
  // Opportunistic cleanup of expired sessions.
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await dbReady();
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  jar.delete(SESSION_COOKIE);
}

/** The signed-in user for this request, or null. Memoised per request. */
export const getCurrentUser = cache(async (): Promise<Actor | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  await dbReady();
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      title: users.title,
      clientId: users.clientId,
      isActive: users.isActive,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!row || !row.isActive) return null;
  const { isActive: _active, ...actor } = row;
  return actor;
});

export const homeFor = (role: UserRole) => (role === "client" ? "/portal" : "/dashboard");

/** For pages: redirect to login (or the right home) when the role doesn't match. */
export async function requirePageUser(roles?: UserRole[]): Promise<Actor> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

export const requireStaffPage = () => requirePageUser(["admin", "team"]);
export const requireClientPage = () => requirePageUser(["client"]);

/** For actions and route handlers: throw instead of redirecting. */
export async function requireActor(roles?: UserRole[]): Promise<Actor> {
  const user = await getCurrentUser();
  if (!user) throw new AppError("Your session has expired. Please sign in again.", "unauthorized");
  if (roles && !roles.includes(user.role)) throw new AppError("You don't have permission to do that.", "forbidden");
  return user;
}

export const requireStaff = () => requireActor(["admin", "team"]);
export const requireAdmin = () => requireActor(["admin"]);

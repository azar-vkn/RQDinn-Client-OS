"use server";

import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db, dbReady } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { createSession, destroySession, homeFor, requireActor } from "@/server/auth/session";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { invalid } from "@/server/errors";
import { formObject, run } from "./run";
import { eq } from "drizzle-orm";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Enter your email.").email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

// Simple in-memory throttle per email (per server instance).
const attempts = new Map<string, { n: number; until: number }>();

export async function loginAction(_prev: unknown, fd: FormData): Promise<{ error?: string; email?: string }> {
  const parsed = loginSchema.safeParse(formObject(fd));
  const emailRaw = String(fd.get("email") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0].message, email: emailRaw };
  const email = parsed.data.email.toLowerCase();

  const a = attempts.get(email);
  if (a && a.until > Date.now()) return { error: "Too many attempts. Please wait a minute and try again.", email: emailRaw };

  await dbReady();
  const [user] = await db.select().from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);
  const ok = user && user.isActive && (await verifyPassword(parsed.data.password, user.passwordHash));
  if (!ok) {
    const n = (a?.n ?? 0) + 1;
    attempts.set(email, { n, until: n >= 5 ? Date.now() + 60_000 : 0 });
    return { error: "That email and password don't match. Please try again.", email: emailRaw };
  }
  attempts.delete(email);
  await createSession(user.id);
  const next = String(fd.get("next") ?? "");
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : null;
  const home = homeFor(user.role);
  redirect(safeNext && (user.role === "client" ? safeNext.startsWith("/portal") : !safeNext.startsWith("/portal")) ? safeNext : home);
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

const pwSchema = z
  .object({
    current: z.string().min(1, "Enter your current password."),
    next: z.string().min(8, "Use at least 8 characters for the new password."),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { message: "The new passwords don't match.", path: ["confirm"] });

export async function changePasswordAction(fd: FormData) {
  return run(async () => {
    const actor = await requireActor();
    const input = pwSchema.parse(formObject(fd));
    const [u] = await db.select().from(users).where(eq(users.id, actor.id));
    if (!(await verifyPassword(input.current, u.passwordHash))) throw invalid("Your current password is incorrect.");
    await db.update(users).set({ passwordHash: await hashPassword(input.next) }).where(eq(users.id, actor.id));
  }, "Password updated.");
}

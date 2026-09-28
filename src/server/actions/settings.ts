"use server";

import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { generateTempPassword, hashPassword } from "@/server/auth/password";
import { DEFAULT_AGENCY, setSetting } from "@/server/services/settings";
import { invalid } from "@/server/errors";
import { formObject, run } from "./run";
import { optionalText, requiredText, uuid } from "./schemas";

const agencySchema = z.object({
  name: requiredText("Brand name", 60),
  legalName: requiredText("Legal name", 160),
  tagline: optionalText(120),
  email: z.string().trim().email("Enter a valid email."),
  phone: optionalText(40),
  whatsapp: optionalText(40),
  address: optionalText(500),
  gstin: optionalText(20),
  bankDetails: optionalText(1000),
  upiId: optionalText(100),
  invoicePrefix: z.string().trim().regex(/^[A-Z0-9]{1,8}$/, "Use 1–8 capital letters or digits."),
  invoiceNotes: optionalText(2000),
});

export async function saveAgencyAction(fd: FormData) {
  return run(async () => {
    await requireAdmin();
    const v = agencySchema.parse(formObject(fd));
    await setSetting("agency", { ...DEFAULT_AGENCY, ...Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x ?? ""])) });
  }, "Agency settings saved.");
}

export async function createTeamMemberAction(fd: FormData) {
  return run(async () => {
    await requireAdmin();
    const v = z
      .object({ name: requiredText("Name"), email: z.string().trim().email("Enter a valid email."), title: optionalText(80), role: z.enum(["admin", "team"]) })
      .parse(formObject(fd));
    const email = v.email.toLowerCase();
    const [exists] = await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${email}`);
    if (exists) throw invalid("A user with this email already exists.");
    const password = generateTempPassword();
    await db.insert(users).values({ name: v.name, email, title: v.title, role: v.role, passwordHash: await hashPassword(password) });
    return { email, password };
  });
}

export async function setUserActiveAction(userId: string, active: boolean) {
  return run(async () => {
    const admin = await requireAdmin();
    if (userId === admin.id) throw invalid("You can't deactivate your own account.");
    await db.update(users).set({ isActive: active }).where(eq(users.id, uuid.parse(userId)));
  }, active ? "User reactivated." : "User deactivated.");
}

/** Wipe everything and re-seed demo data. Admin only, DEMO_MODE only. */
export async function resetDemoDataAction(fresh: boolean) {
  const res = await run(async () => {
    await requireAdmin();
    if (process.env.DEMO_MODE === "false") throw invalid("Demo reset is disabled (DEMO_MODE=false).");
    const { truncateAll, seed } = await import("@/server/db/seed");
    await truncateAll();
    await seed({ freshDparkz: fresh });
  });
  if (res.ok) redirect("/login");
  return res;
}

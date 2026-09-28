/**
 * Production setup: wipe everything (including demo data), install the
 * essentials and create the first admin account.
 */
import crypto from "node:crypto";
import { db } from "./client";
import * as s from "./schema";
import { seedBase, truncateAll } from "./seed";
import { hashPassword } from "@/server/auth/password";

/** 20 characters from an unambiguous alphabet (~117 bits). */
export function generateStrongPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const chars = Array.from({ length: 20 }, () => alphabet[crypto.randomInt(alphabet.length)]);
  return `${chars.slice(0, 5).join("")}-${chars.slice(5, 10).join("")}-${chars.slice(10, 15).join("")}-${chars.slice(15).join("")}`;
}

export async function setupProduction(input: { name: string; email: string; password: string; title?: string }) {
  await truncateAll(db);
  await seedBase();
  const [admin] = await db
    .insert(s.users)
    .values({
      name: input.name,
      email: input.email.trim().toLowerCase(),
      title: input.title ?? "Founder",
      role: "admin",
      passwordHash: await hashPassword(input.password),
    })
    .returning({ id: s.users.id, email: s.users.email });
  return admin;
}

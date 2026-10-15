"use server";

import { z } from "zod";
import { requireAdmin } from "@/server/auth/session";
import { deleteService, saveService } from "@/server/services/catalog";
import { SERVICE_BILLINGS } from "@/lib/constants";
import { rupeesToPaise } from "@/lib/validators";
import { run } from "./run";
import { optionalText, requiredText, uuid } from "./schemas";

/** ₹1 crore — keeps any price comfortably inside the integer column. */
const MAX_PRICE_PAISE = 1_00_00_000 * 100;

const price = z.union([z.string(), z.number()]).transform((v, ctx) => {
  if (String(v).trim() === "") {
    ctx.addIssue({ code: "custom", message: "Enter a price." });
    return z.NEVER;
  }
  const paise = rupeesToPaise(v);
  if (!Number.isFinite(paise) || paise > MAX_PRICE_PAISE) {
    ctx.addIssue({ code: "custom", message: "Enter a valid price (up to ₹1,00,00,000)." });
    return z.NEVER;
  }
  return paise;
});

const schema = z.object({
  name: requiredText("Service name", 120),
  category: optionalText(60).transform((v) => v ?? "General"),
  description: optionalText(1000),
  price,
  billing: z.enum(SERVICE_BILLINGS),
  features: z
    .array(z.string().trim().max(200, "Keep each line under 200 characters."))
    .max(25, "Keep it to 25 lines.")
    .transform((a) => a.filter(Boolean)),
  isActive: z.boolean(),
});

export async function saveServiceAction(id: string | null, input: unknown) {
  return run(async () => {
    await requireAdmin();
    const data = schema.parse(input);
    return { id: await saveService(id ? uuid.parse(id) : null, data) };
  }, "Service saved.");
}

export async function deleteServiceAction(id: string) {
  return run(async () => {
    await requireAdmin();
    await deleteService(uuid.parse(id));
  }, "Service deleted.");
}

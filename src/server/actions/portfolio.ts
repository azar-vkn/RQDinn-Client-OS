"use server";

import { z } from "zod";
import { requireAdmin } from "@/server/auth/session";
import { deletePortfolioItem, savePortfolioItem } from "@/server/services/portfolio";
import { findShareImage } from "@/server/integrations/link-preview";
import { invalid } from "@/server/errors";
import { normalizeUrl } from "@/lib/validators";
import { run } from "./run";
import { optionalText, optionalUrl, optionalUuid, requiredText, uuid } from "./schemas";

const MAX_YEAR = new Date().getFullYear() + 1;

const schema = z.object({
  title: requiredText("Project name", 120),
  url: z
    .string({ error: "Website link is required." })
    .trim()
    .min(1, "Website link is required.")
    .transform((v, ctx) => {
      const u = normalizeUrl(v);
      if (!u) {
        ctx.addIssue({ code: "custom", message: "Website link: please enter a valid link." });
        return z.NEVER;
      }
      return u;
    }),
  clientName: optionalText(120),
  category: optionalText(60),
  description: optionalText(1000),
  imageUrl: optionalUrl("Cover image link"),
  tags: z
    .array(z.string().trim().max(40, "Keep each tag under 40 characters."))
    .max(12, "Use up to 12 tags.")
    .transform((a) => [...new Set(a.filter(Boolean))]),
  year: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((v, ctx) => {
      if (v === null || v === undefined || String(v).trim() === "") return null;
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1990 || n > MAX_YEAR) {
        ctx.addIssue({ code: "custom", message: `Year: enter a year between 1990 and ${MAX_YEAR}.` });
        return z.NEVER;
      }
      return n;
    }),
  isFeatured: z.boolean(),
  projectId: optionalUuid,
});

export async function savePortfolioAction(id: string | null, input: unknown) {
  return run(async () => {
    const admin = await requireAdmin();
    const data = schema.parse(input);
    return { id: await savePortfolioItem(id ? uuid.parse(id) : null, data, admin.id) };
  }, "Portfolio saved.");
}

/** Look up the site's share image (og:image) to use as the card cover. */
export async function detectCoverImageAction(url: string) {
  return run(async () => {
    await requireAdmin();
    const normalized = typeof url === "string" ? normalizeUrl(url) : null;
    if (!normalized) throw invalid("Enter the website link first.");
    const imageUrl = await findShareImage(normalized);
    if (!imageUrl) throw invalid("This site doesn't publish a preview image. Paste an image link instead, or leave it empty.");
    return { imageUrl };
  }, "Cover image found.");
}

export async function deletePortfolioAction(id: string) {
  return run(async () => {
    await requireAdmin();
    await deletePortfolioItem(uuid.parse(id));
  }, "Removed from portfolio.");
}

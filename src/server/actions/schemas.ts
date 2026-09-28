import { z } from "zod";
import { normalizeUrl, rupeesToPaise } from "@/lib/validators";

/** Reusable zod helpers for FormData input. */
export const optionalText = (max = 2000) =>
  z
    .string()
    .max(max, `Keep this under ${max} characters.`)
    .optional()
    .nullable()
    .transform((v) => (v && v.trim() ? v.trim() : null));

export const requiredText = (label: string, max = 300) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} is too long.`);

export const optionalUrl = (label: string) =>
  z
    .string()
    .optional()
    .nullable()
    .transform((v, ctx) => {
      if (!v || !v.trim()) return null;
      const u = normalizeUrl(v);
      if (!u) {
        ctx.addIssue({ code: "custom", message: `${label}: please enter a valid link.` });
        return z.NEVER;
      }
      return u;
    });

export const optionalEmail = z
  .string()
  .optional()
  .nullable()
  .transform((v, ctx) => {
    if (!v || !v.trim()) return null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())) {
      ctx.addIssue({ code: "custom", message: "Please enter a valid email address." });
      return z.NEVER;
    }
    return v.trim().toLowerCase();
  });

export const optionalPhone = (label = "Phone") =>
  z
    .string()
    .optional()
    .nullable()
    .transform((v, ctx) => {
      if (!v || !v.trim()) return null;
      if (!/^\+?[\d\s\-()]{7,20}$/.test(v.trim())) {
        ctx.addIssue({ code: "custom", message: `${label}: please enter a valid phone number.` });
        return z.NEVER;
      }
      return v.trim();
    });

export const money = (label: string, { required = false } = {}) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((v, ctx) => {
      if ((v === undefined || v === null || v === "") && !required) return 0;
      const p = rupeesToPaise(v as string);
      if (!Number.isFinite(p) || (required && p <= 0)) {
        ctx.addIssue({ code: "custom", message: `${label}: enter a valid amount.` });
        return z.NEVER;
      }
      return p;
    });

export const optionalDate = z
  .string()
  .optional()
  .nullable()
  .transform((v, ctx) => {
    if (!v) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      ctx.addIssue({ code: "custom", message: "Please enter a valid date." });
      return z.NEVER;
    }
    return v;
  });

export const uuid = z.string().uuid("Invalid reference.");
export const optionalUuid = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .pipe(z.string().uuid().nullable());

export const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.boolean()])
  .optional()
  .transform((v) => v === "on" || v === "true" || v === true);

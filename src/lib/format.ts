import { format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrPrecise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });

/** Format an amount stored in paise. */
export function formatMoney(paise: number | null | undefined, precise = false) {
  const v = (paise ?? 0) / 100;
  return precise || v % 1 !== 0 ? inrPrecise.format(v) : inr.format(v);
}

/** Paise → rupee number for form inputs. */
export const paiseToRupees = (paise: number | null | undefined) => ((paise ?? 0) / 100).toString();

function toDate(d: Date | string | null | undefined): Date | null {
  if (!d) return null;
  const date = typeof d === "string" ? (d.length <= 10 ? parseISO(d) : new Date(d)) : d;
  return isValid(date) ? date : null;
}

export function formatDate(d: Date | string | null | undefined, pattern = "d MMM yyyy") {
  const date = toDate(d);
  return date ? format(date, pattern) : "—";
}

export function formatDateTime(d: Date | string | null | undefined) {
  return formatDate(d, "d MMM yyyy, h:mm a");
}

export function timeAgo(d: Date | string | null | undefined) {
  const date = toDate(d);
  return date ? `${formatDistanceToNowStrict(date)} ago` : "—";
}

export function toDateInput(d: Date | string | null | undefined) {
  const date = toDate(d);
  return date ? format(date, "yyyy-MM-dd") : "";
}

export function toDateTimeInput(d: Date | string | null | undefined) {
  const date = toDate(d);
  return date ? format(date, "yyyy-MM-dd'T'HH:mm") : "";
}

export function todayISO() {
  return format(new Date(), "yyyy-MM-dd");
}

export function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function daysUntil(d: Date | string | null | undefined) {
  const date = toDate(d);
  if (!date) return null;
  const ms = date.getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.round(ms / 86_400_000);
}

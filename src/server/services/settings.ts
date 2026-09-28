import { eq } from "drizzle-orm";
import { db, type DbOrTx } from "@/server/db/client";
import { settings } from "@/server/db/schema";

export interface AgencySettings {
  name: string;
  legalName: string;
  tagline: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  gstin: string;
  bankDetails: string;
  upiId: string;
  invoicePrefix: string;
  invoiceNotes: string;
}

export const DEFAULT_AGENCY: AgencySettings = {
  name: "RQDINN",
  legalName: "RQdinn Digital",
  tagline: "Build. Manage. Deliver.",
  email: "hello@rqdinn.com",
  phone: "+91 90000 00000",
  whatsapp: "+91 90000 00000",
  address: "Kerala, India",
  gstin: "",
  bankDetails: "Bank: —\nA/C: —\nIFSC: —",
  upiId: "",
  invoicePrefix: "RQ",
  invoiceNotes: "Thank you for choosing RQdinn. Payment is due within 7 days of the invoice date.",
};

export async function getSetting<T>(key: string, fallback: T, tx: DbOrTx = db): Promise<T> {
  const [row] = await tx.select().from(settings).where(eq(settings.key, key));
  return row ? ({ ...fallback, ...(row.value as object) } as T) : fallback;
}

export async function setSetting(key: string, value: unknown, tx: DbOrTx = db) {
  await tx
    .insert(settings)
    .values({ key, value: value as never })
    .onConflictDoUpdate({ target: settings.key, set: { value: value as never, updatedAt: new Date() } });
}

export const getAgency = (tx: DbOrTx = db) => getSetting<AgencySettings>("agency", DEFAULT_AGENCY, tx);

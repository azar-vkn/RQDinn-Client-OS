import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { services } from "@/server/db/schema";
import type { ServiceBillingValue } from "@/lib/constants";
import { notFound } from "@/server/errors";

/** Service catalog (Services page). Prices are stored in paise. */

export async function listServices(opts: { includeHidden?: boolean } = {}) {
  return db
    .select()
    .from(services)
    .where(opts.includeHidden ? undefined : eq(services.isActive, true))
    .orderBy(asc(services.position), asc(services.createdAt));
}

export type CatalogService = Awaited<ReturnType<typeof listServices>>[number];

export interface ServiceInput {
  name: string;
  category: string;
  description: string | null;
  price: number;
  billing: ServiceBillingValue;
  features: string[];
  isActive: boolean;
}

export async function saveService(id: string | null, input: ServiceInput) {
  if (id) {
    const [row] = await db.update(services).set(input).where(eq(services.id, id)).returning({ id: services.id });
    if (!row) throw notFound("Service");
    return row.id;
  }
  const [{ next }] = await db.select({ next: sql<number>`coalesce(max(${services.position}), 0)::int + 1` }).from(services);
  const [row] = await db
    .insert(services)
    .values({ ...input, position: next })
    .returning({ id: services.id });
  return row.id;
}

export async function deleteService(id: string) {
  const [row] = await db.delete(services).where(eq(services.id, id)).returning({ id: services.id });
  if (!row) throw notFound("Service");
}

import { and, asc, desc, eq, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { clients, portfolioItems, projects } from "@/server/db/schema";
import { invalid, notFound } from "@/server/errors";

/** Portfolio of delivered work. Featured items first, then newest. */
export async function listPortfolio() {
  return db
    .select()
    .from(portfolioItems)
    .orderBy(desc(portfolioItems.isFeatured), sql`${portfolioItems.year} desc nulls last`, desc(portfolioItems.createdAt));
}

export type PortfolioEntry = Awaited<ReturnType<typeof listPortfolio>>[number];

/** Projects that have a live URL — offered as a shortcut when adding portfolio items. */
export async function projectsWithLiveUrl() {
  return db
    .select({ id: projects.id, name: projects.name, liveUrl: projects.liveUrl, clientName: clients.companyName })
    .from(projects)
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .where(and(isNotNull(projects.liveUrl), ne(projects.liveUrl, "")))
    .orderBy(asc(projects.name));
}

export interface PortfolioInput {
  title: string;
  url: string;
  clientName: string | null;
  category: string | null;
  description: string | null;
  imageUrl: string | null;
  tags: string[];
  year: number | null;
  isFeatured: boolean;
  projectId: string | null;
}

export async function savePortfolioItem(id: string | null, input: PortfolioInput, actorId: string) {
  if (input.projectId) {
    const [p] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, input.projectId));
    if (!p) throw invalid("The linked project no longer exists. Choose another project or none.");
  }
  if (id) {
    const [row] = await db.update(portfolioItems).set(input).where(eq(portfolioItems.id, id)).returning({ id: portfolioItems.id });
    if (!row) throw notFound("Portfolio item");
    return row.id;
  }
  const [row] = await db
    .insert(portfolioItems)
    .values({ ...input, createdById: actorId })
    .returning({ id: portfolioItems.id });
  return row.id;
}

export async function deletePortfolioItem(id: string) {
  const [row] = await db.delete(portfolioItems).where(eq(portfolioItems.id, id)).returning({ id: portfolioItems.id });
  if (!row) throw notFound("Portfolio item");
}

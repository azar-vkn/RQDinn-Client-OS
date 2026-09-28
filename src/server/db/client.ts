import path from "node:path";
import fs from "node:fs";
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { isDemoMode } from "../demo-mode";

/**
 * Database access.
 *
 * - With DATABASE_URL set → real PostgreSQL over TCP (Supabase, Neon, RDS…).
 * - Without it → embedded PostgreSQL (PGlite) persisted on disk. Same SQL, same
 *   migrations; ideal for local development and demos.
 *
 * Instances are cached on globalThis so dev-mode module reloading never opens
 * the same PGlite data directory twice.
 */

export type Database = PostgresJsDatabase<typeof schema>;

type DbState = {
  db: Database;
  driver: "postgres" | "pglite";
  ready: Promise<void>;
  close: () => Promise<void>;
};

const globalForDb = globalThis as unknown as { __rqdinnDb?: DbState };

function createState(): DbState {
  const url = process.env.DATABASE_URL?.trim();

  if (url) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const postgres = require("postgres") as typeof import("postgres");
    const sqlClient = postgres(url, {
      max: 10,
      prepare: false, // required by Supabase's transaction pooler
      idle_timeout: 20, // close idle sockets before the pooler drops them
      max_lifetime: 60 * 30,
      connect_timeout: 15,
      onnotice: () => {},
    });
    const db = drizzlePostgres(sqlClient, { schema, casing: "snake_case" });
    const ready = (async () => {
      if (process.env.AUTO_MIGRATE === "true") {
        const { migrate } = await import("drizzle-orm/postgres-js/migrator");
        await migrate(db, { migrationsFolder: migrationsFolder() });
      }
    })();
    return { db, driver: "postgres", ready, close: () => sqlClient.end() };
  }

  // The embedded database needs a writable disk, so it can't run on Vercel.
  if (process.env.VERCEL) {
    throw new Error(
      "DATABASE_URL is not set. Add your Supabase connection string in Vercel → Project → Settings → Environment Variables, then redeploy.",
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PGlite } = require("@electric-sql/pglite") as typeof import("@electric-sql/pglite");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle: drizzlePglite } = require("drizzle-orm/pglite") as typeof import("drizzle-orm/pglite");
  const dataDir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.PGLITE_DATA_DIR || "./.data/pglite");
  fs.mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzlePglite(client, { schema, casing: "snake_case" }) as unknown as Database;
  const ready = (async () => {
    await client.waitReady;
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(db as never, { migrationsFolder: migrationsFolder() });
    if (isDemoMode()) {
      const { seedIfEmpty } = await import("./seed");
      await seedIfEmpty(db);
    }
  })();
  return { db, driver: "pglite", ready, close: () => client.close() };
}

function migrationsFolder() {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), "drizzle");
}

function state(): DbState {
  if (!globalForDb.__rqdinnDb) globalForDb.__rqdinnDb = createState();
  return globalForDb.__rqdinnDb;
}

/** Drizzle instance. Always `await dbReady()` once per request before the first query (done by the auth layer). */
export const db: Database = new Proxy({} as Database, {
  get(_target, prop) {
    const real = state().db as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(real) : value;
  },
});

export function dbReady(): Promise<void> {
  return state().ready;
}

export function dbDriver() {
  return state().driver;
}

export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DbOrTx = Database | Tx;

/**
 * Database CLI (run with tsx):
 *   migrate                 apply migrations
 *   seed                    seed demo data if the database is empty
 *   reset [--fresh-dparkz]  wipe all data and re-seed (fresh-dparkz leaves D'PARKZ out so you can create it live)
 *   setup --name "Your Name" --email you@example.com --yes
 *                           PRODUCTION: wipe ALL data (incl. demo), install workflows/templates and
 *                           create the first admin. Prints a generated password once
 *                           (or uses ADMIN_PASSWORD from the environment).
 *
 * `seed` and `reset` refuse to run when DEMO_MODE=false unless --force is passed.
 *
 * Stop `npm run dev` first when using the embedded database (PGlite allows one process at a time).
 */
import fs from "node:fs";
import path from "node:path";

function loadEnvFile(file: string) {
  const full = path.resolve(process.cwd(), file);
  if (!fs.existsSync(full)) return;
  for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

function flag(flags: string[], name: string) {
  const i = flags.findIndex((f) => f === `--${name}` || f.startsWith(`--${name}=`));
  if (i < 0) return undefined;
  const f = flags[i];
  return f.includes("=") ? f.slice(f.indexOf("=") + 1) : flags[i + 1];
}

function describeTarget() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return `embedded database (${process.env.PGLITE_DATA_DIR || "./.data/pglite"})`;
  try {
    return `PostgreSQL at ${new URL(url).host}`;
  } catch {
    return "PostgreSQL (DATABASE_URL)";
  }
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");
  const [cmd, ...flags] = process.argv.slice(2);
  // Seeding is controlled explicitly by this CLI, not by the auto-seed in client.ts.
  const prevDemo = process.env.DEMO_MODE;
  process.env.DEMO_MODE = "false";
  process.env.AUTO_MIGRATE = "true";

  const { db, dbReady } = await import("./client");
  await dbReady();
  process.env.DEMO_MODE = prevDemo;
  const { seed, seedIfEmpty, truncateAll } = await import("./seed");
  const demoOff = process.env.DEMO_MODE === "false";

  if ((cmd === "seed" || cmd === "reset") && demoOff && !flags.includes("--force")) {
    console.error(`Refusing to load demo data: DEMO_MODE=false (target: ${describeTarget()}). Pass --force if you really mean it.`);
    process.exitCode = 1;
  } else if (cmd === "setup") {
    const name = flag(flags, "name")?.trim();
    const email = flag(flags, "email")?.trim();
    if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      console.error('Usage: npm run setup:admin -- --name "Your Name" --email you@example.com --yes');
      process.exitCode = 1;
    } else if (!flags.includes("--yes")) {
      console.log(`This will DELETE ALL DATA in the ${describeTarget()} and create one admin: ${name} <${email}>.`);
      console.log("Run again with --yes to continue.");
    } else {
      const { setupProduction, generateStrongPassword } = await import("./setup");
      const fromEnv = process.env.ADMIN_PASSWORD?.trim();
      if (fromEnv && fromEnv.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
      const password = fromEnv || generateStrongPassword();
      console.log(`Setting up ${describeTarget()}…`);
      await setupProduction({ name, email, password });
      console.log("");
      console.log("  RQdinn Client OS is ready.");
      console.log(`  Admin email:    ${email.toLowerCase()}`);
      console.log(fromEnv ? "  Admin password: (the ADMIN_PASSWORD you provided)" : `  Admin password: ${password}`);
      console.log("");
      console.log("  Save this password now — it is not stored anywhere in readable form.");
      console.log("  Next: sign in, then fill in Settings → Agency (bank details, phone, GSTIN) and add your team.");
    }
  } else if (cmd === "migrate") {
    console.log("Migrations applied.");
  } else if (cmd === "seed") {
    await seedIfEmpty(db);
  } else if (cmd === "reset") {
    await truncateAll(db);
    await seed({ freshDparkz: flags.includes("--fresh-dparkz") });
  } else {
    console.log("Usage: tsx src/server/db/cli.ts <migrate|seed|reset|setup> [--fresh-dparkz] [--force]");
    process.exitCode = 1;
  }
  const g = globalThis as unknown as { __rqdinnDb?: { close: () => Promise<void> } };
  await g.__rqdinnDb?.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

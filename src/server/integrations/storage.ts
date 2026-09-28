import fs from "node:fs/promises";
import path from "node:path";

/**
 * File storage abstraction.
 * - local:    disk (development / single-server deployments)
 * - supabase: Supabase Storage private bucket (serverless deployments, e.g. Vercel)
 * Files are always served through the app's authorised download route, never public URLs.
 */
export interface StorageDriver {
  put(key: string, data: Buffer, mimeType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}

function localRoot() {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.STORAGE_LOCAL_DIR || "./storage/uploads");
}

function safePath(key: string) {
  const root = localRoot();
  const full = path.resolve(root, key);
  if (!full.startsWith(root + path.sep)) throw new Error("Invalid storage key");
  return full;
}

const localDriver: StorageDriver = {
  async put(key, data) {
    const full = safePath(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
  },
  async get(key) {
    return fs.readFile(safePath(key));
  },
  async remove(key) {
    await fs.rm(safePath(key), { force: true });
  },
};

function supabaseDriver(): StorageDriver {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "client-files";
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for the supabase storage driver.");
  const auth = { Authorization: `Bearer ${key}`, apikey: key };
  const objectUrl = (k: string) => `${url}/storage/v1/object/${bucket}/${k.split("/").map(encodeURIComponent).join("/")}`;

  return {
    async put(k, data, mimeType) {
      const res = await fetch(objectUrl(k), {
        method: "POST",
        headers: { ...auth, "Content-Type": mimeType, "x-upsert": "true" },
        body: new Uint8Array(data),
      });
      if (!res.ok) throw new Error(`Supabase upload failed (${res.status}): ${await res.text()}`);
    },
    async get(k) {
      const res = await fetch(objectUrl(k), { headers: auth });
      if (!res.ok) throw new Error(`Supabase download failed (${res.status})`);
      return Buffer.from(await res.arrayBuffer());
    },
    async remove(k) {
      const res = await fetch(`${url}/storage/v1/object/${bucket}`, {
        method: "DELETE",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: [k] }),
      });
      if (!res.ok) throw new Error(`Supabase delete failed (${res.status})`);
    },
  };
}

export function storage(): StorageDriver {
  const driver = process.env.STORAGE_DRIVER || "local";
  if (driver === "local") return localDriver;
  if (driver === "supabase") return supabaseDriver();
  throw new Error(`Storage driver "${driver}" is not implemented.`);
}

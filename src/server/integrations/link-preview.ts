import "server-only";
import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

/**
 * Finds a website's share image (og:image / twitter:image) so portfolio cards
 * can show a cover without anyone uploading one.
 *
 * The URL comes from an admin, but it is still fetched defensively: http(s)
 * only, every hop's host must resolve to a public address (no localhost,
 * private networks or cloud metadata), few redirects, short timeout and a
 * capped download.
 */

const MAX_REDIRECTS = 4;
const MAX_BYTES = 768 * 1024;
const TIMEOUT_MS = 8000;

const blocked = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 3],
] as const) {
  blocked.addSubnet(net, prefix, "ipv4");
}
for (const [net, prefix] of [
  ["::", 127],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
  ["64:ff9b::", 96],
  ["2001:db8::", 32],
] as const) {
  blocked.addSubnet(net, prefix, "ipv6");
}

function isBlockedAddress(address: string) {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (mapped) return blocked.check(mapped[1], "ipv4");
  const family = isIP(address);
  if (family === 4) return blocked.check(address, "ipv4");
  if (family === 6) return blocked.check(address, "ipv6");
  return true;
}

async function assertPublicHost(url: URL) {
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("unsupported protocol");
  if (url.username || url.password) throw new Error("credentials in URL");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) throw new Error("private host");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((a) => isBlockedAddress(a.address))) throw new Error("private address");
}

async function readCapped(res: Response) {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength;
  }
  await reader.cancel().catch(() => {});
  return new TextDecoder("utf-8").decode(Buffer.concat(chunks).subarray(0, MAX_BYTES));
}

async function fetchHtml(start: string) {
  let url = new URL(start);
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url);
    const res = await fetch(url, {
      redirect: "manual",
      signal,
      cache: "no-store",
      headers: { "user-agent": "Mozilla/5.0 (compatible; RQdinnPreview/1.0)", accept: "text/html,application/xhtml+xml" },
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      await res.body?.cancel().catch(() => {});
      if (!location) return null;
      url = new URL(location, url);
      continue;
    }
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) {
      await res.body?.cancel().catch(() => {});
      return null;
    }
    return { html: await readCapped(res), finalUrl: url };
  }
  return null;
}

const decodeEntities = (s: string) =>
  s
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x2F;/gi, "/");

const IMAGE_KEYS = ["og:image:secure_url", "og:image:url", "og:image", "twitter:image", "twitter:image:src"];

/** Pull the best share image out of a page's <meta> tags. Exported for tests. */
export function extractShareImage(html: string, baseUrl: URL): string | null {
  const found = new Map<string, string>();
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attr = (name: string) => new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
    const key = attr("property") ?? attr("name");
    const content = attr("content");
    if (!key || !content) continue;
    const k = (key[2] ?? key[3] ?? key[4] ?? "").trim().toLowerCase();
    const v = decodeEntities((content[2] ?? content[3] ?? content[4] ?? "").trim());
    if (IMAGE_KEYS.includes(k) && v && !found.has(k)) found.set(k, v);
  }
  for (const k of IMAGE_KEYS) {
    const v = found.get(k);
    if (!v) continue;
    try {
      const u = new URL(v, baseUrl);
      if (u.protocol === "https:" || u.protocol === "http:") return u.toString();
    } catch {
      // try the next candidate
    }
  }
  return null;
}

export async function findShareImage(url: string): Promise<string | null> {
  try {
    const page = await fetchHtml(url);
    return page ? extractShareImage(page.html, page.finalUrl) : null;
  } catch {
    return null;
  }
}


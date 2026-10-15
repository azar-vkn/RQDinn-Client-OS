const MSHOTS = "https://s.wordpress.com/mshots/v1/";

/** WordPress mShots: a free, keyless screenshot of the page's first 1280×800 (its hero). */
export function mshotsUrl(url: string): string {
  return `${MSHOTS}${encodeURIComponent(url)}?w=1280&h=800`;
}

/**
 * The hero screenshot of a website, served through /api/screenshot. mShots
 * answers with a "Generating Preview" placeholder until the capture is ready;
 * the route waits for the real image so the browser never caches the placeholder.
 */
export function websiteScreenshotUrl(url: string): string {
  return `/api/screenshot?url=${encodeURIComponent(url)}`;
}

/** Older covers stored the raw mShots link; route those through the proxy too. */
export function coverSrc(imageUrl: string): string {
  if (!imageUrl.startsWith(MSHOTS)) return imageUrl;
  try {
    const target = decodeURIComponent(new URL(imageUrl).pathname.slice("/mshots/v1/".length));
    return websiteScreenshotUrl(target);
  } catch {
    return imageUrl;
  }
}

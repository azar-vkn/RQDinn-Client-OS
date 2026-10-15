/**
 * A live screenshot of a website's hero (the first 1280×800 of the page),
 * used as the portfolio cover when no cover image is set.
 * WordPress mShots is free and keyless; it serves a "generating" placeholder
 * for the first few seconds, then the cached screenshot.
 */
export function websiteScreenshotUrl(url: string): string {
  return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=1280&h=800`;
}

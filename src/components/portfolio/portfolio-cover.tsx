"use client";

import * as React from "react";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import { websiteScreenshotUrl } from "@/lib/screenshot";

export function hostnameOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const COVER_TONES = [
  "from-orange-soft via-[#f8e3d8] to-orange-light/60 text-orange-dark",
  "from-green-soft via-green-light to-[#c9dcc8] text-green-dark",
  "from-sky-soft via-[#d9e6ee] to-[#c3d6e2] text-sky",
  "from-amber-soft via-[#f3e5c8] to-[#ead7ae] text-amber",
];

/**
 * Cover image; without one, a screenshot of the site's hero; and a branded
 * tile when neither is available (or loads).
 */
export function PortfolioCover({ title, url, imageUrl, screenshot = true, className }: { title: string; url: string; imageUrl: string | null; screenshot?: boolean; className?: string }) {
  // Remember which link failed, so a new link is tried again.
  const [failedUrl, setFailedUrl] = React.useState<string | null>(null);
  const tone = COVER_TONES[[...title].reduce((s, c) => s + c.charCodeAt(0), 0) % COVER_TONES.length];
  const src = imageUrl || (screenshot && url ? websiteScreenshotUrl(url) : null);
  if (src && failedUrl !== src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- covers come from arbitrary client domains
      <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedUrl(src)} className={cn("size-full object-cover object-top", className)} />
    );
  }
  return (
    <div className={cn("flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-br", tone, className)}>
      <span className="font-serif text-4xl font-medium tracking-tight">{initials(title)}</span>
      <span className="flex items-center gap-1 text-xs font-medium opacity-80">
        <Globe className="size-3" /> {hostnameOf(url)}
      </span>
    </div>
  );
}

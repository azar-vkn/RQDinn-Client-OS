"use client";

import * as React from "react";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

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

/** Cover image, or a branded tile when there's no image (or it fails to load). */
export function PortfolioCover({ title, url, imageUrl, className }: { title: string; url: string; imageUrl: string | null; className?: string }) {
  // Remember which link failed, so a new link is tried again.
  const [failedUrl, setFailedUrl] = React.useState<string | null>(null);
  const tone = COVER_TONES[[...title].reduce((s, c) => s + c.charCodeAt(0), 0) % COVER_TONES.length];
  if (imageUrl && failedUrl !== imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- covers come from arbitrary client domains
      <img src={imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedUrl(imageUrl)} className={cn("size-full object-cover", className)} />
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

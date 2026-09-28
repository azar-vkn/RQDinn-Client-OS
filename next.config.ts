import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships a WASM Postgres build and must be loaded with native require.
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  poweredByHeader: false,
  // Hide the floating Next.js "N" dev badge (error overlays still appear when something breaks).
  devIndicators: false,
  // Ship SQL migrations with the server bundle (used when AUTO_MIGRATE=true).
  outputFileTracingIncludes: { "/*": ["./drizzle/**/*"] },
};

export default nextConfig;

/**
 * Demo mode (one-click demo logins, auto-seeded demo data, in-app demo reset).
 * - DEMO_MODE=true  → on
 * - DEMO_MODE=false → off
 * - unset           → on in development, OFF in production builds
 *   (so a deployment without configured env vars never exposes demo logins).
 */
export function isDemoMode() {
  const v = process.env.DEMO_MODE?.trim().toLowerCase();
  if (v === "true") return true;
  if (v === "false") return false;
  return process.env.NODE_ENV !== "production";
}

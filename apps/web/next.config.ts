import withPWAInit from "@ducanh2912/next-pwa";
import type { NextConfig } from "next";

const apiProxyTarget = (
  process.env.API_PROXY_TARGET ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001"
).replace(/\/$/, "");

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  reloadOnOnline: true,
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    disableDevLogs: true,
    // Keep API proxy out of the offline document fallback / SW navigation handling.
    navigateFallbackDenylist: [/^\/backend/],
  },
});

const nextConfig: NextConfig = {
  // next-pwa injects webpack; allow Turbopack for `next dev` (PWA is disabled in development).
  turbopack: {},
  async rewrites() {
    // Only proxy when the target is an absolute upstream API URL.
    if (!/^https?:\/\//.test(apiProxyTarget)) {
      return [];
    }
    return [
      {
        source: "/backend/:path*",
        destination: `${apiProxyTarget}/:path*`,
      },
    ];
  },
};

export default withPWA(nextConfig);

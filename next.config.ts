import type { NextConfig } from "next";
const config: NextConfig = {
  devIndicators: false,
  outputFileTracingIncludes: { "/api/clips/*/media": ["./public/media/atlas-review.wav"] },
  reactStrictMode: true,
  poweredByHeader: false,
  logging: {
    incomingRequests: false,
    fetches: { fullUrl: false },
    serverFunctions: false,
    browserToTerminal: false,
  },
  async headers() {
    return [
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
      {
        source: "/reset-password",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      {
        source: "/users/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      { source: "/account", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};
export default config;

import type { NextConfig } from "next";
const config: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ["ffmpeg-static"],
  outputFileTracingIncludes: {
    "/api/clips/*/media": ["./public/media/atlas-review.wav"],
    "/api/meetings/*/clips/preview": [
      "./public/media/atlas-review.wav",
      "./node_modules/ffmpeg-static/ffmpeg",
    ],
    "/api/shares": ["./public/media/atlas-review.wav", "./node_modules/ffmpeg-static/ffmpeg"],
  },
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

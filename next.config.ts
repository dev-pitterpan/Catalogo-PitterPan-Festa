import type { NextConfig } from "next";
const config: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  // Preserva os links públicos existentes com barra final.
  trailingSlash: true,
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/*": ["./config/*.json", "./public/data/**/*.json"],
  },
};
export default config;

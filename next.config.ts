import { withWorkflow } from "workflow/next";
import type { NextConfig } from "next";
const config: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        has: [{ type: "host", value: "gestaopitterpan\\.vercel\\.app" }],
        destination: "/gestor/",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      ...[
        "/api/admin/:path*",
        "/api/auth/:path*",
        "/api/cron/:path*",
        "/gestor/:path*",
        "/login/:path*",
      ].map((source) => ({
        source,
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      })),
    ];
  },
  // Preserva os links públicos existentes com barra final.
  trailingSlash: true,
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/*": ["./config/*.json", "./public/data/**/*.json"],
  },
};
export default withWorkflow(config);

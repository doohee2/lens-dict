import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
});

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "worker-src 'self' blob:",
      "img-src 'self' data: blob: https: https://*.gstatic.com https://*.googleapis.com https://*.googleusercontent.com https://*.ggpht.com",
      "media-src 'self' https: http: data: blob:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: cdn.jsdelivr.net unpkg.com https://*.googleapis.com https://*.gstatic.com",
      "style-src 'self' 'unsafe-inline' fonts.googleapis.com https://*.googleapis.com https://*.gstatic.com",
      "font-src 'self' data: fonts.gstatic.com https://*.gstatic.com https://*.googleapis.com https://*.googleusercontent.com https://*.ggpht.com",
      "connect-src 'self' cdn.jsdelivr.net tessdata.projectnaptha.com unpkg.com fonts.googleapis.com fonts.gstatic.com https://*.gstatic.com https://*.googleapis.com https://*.googleusercontent.com https://*.ggpht.com https://api.dictionaryapi.dev https://*.wiktionary.org https://*.wikimedia.org https://en.wikipedia.org",
    ].join("; "),
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSerwist(nextConfig);

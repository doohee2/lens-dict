import { type PrecacheEntry, Serwist, CacheFirst, NetworkFirst, StaleWhileRevalidate, ExpirationPlugin } from "serwist";

declare global {
  interface WorkerGlobalScope {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: any;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: /\.(?:js|css|woff2?|eot|ttf|otf|png|jpg|jpeg|gif|webp|svg|ico)$/i,
      handler: new CacheFirst({
        cacheName: "static-assets",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 128,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
          }),
        ],
      }),
    },
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new StaleWhileRevalidate({
        cacheName: "html-documents",
      }),
    },
    {
      matcher: ({ url }) => url.pathname.includes("_next/data") || url.searchParams.has("_rsc"),
      handler: new StaleWhileRevalidate({
        cacheName: "rsc-data",
      }),
    },
    {
      matcher: ({ url }) => url.pathname.startsWith("/api/"),
      handler: new NetworkFirst({
        cacheName: "api-calls",
        networkTimeoutSeconds: 5,
      }),
    }
  ],
});

serwist.addEventListeners();

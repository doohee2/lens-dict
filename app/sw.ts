import { type PrecacheEntry, Serwist, CacheFirst, NetworkFirst, StaleWhileRevalidate, ExpirationPlugin, CacheableResponsePlugin } from "serwist";

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
  navigationPreload: false,
  runtimeCaching: [
    // [Rule 1: 구글 폰트 및 외부 교차 도메인 아바타/이미지/CDN 리소스 (30일 이하 StaleWhileRevalidate + 0번 응답 방어)]
    {
      matcher: ({ url, request }) =>
        url.hostname.includes("fonts.googleapis.com") ||
        url.hostname.includes("fonts.gstatic.com") ||
        url.hostname.includes("googleusercontent.com") ||
        url.hostname.includes("ggpht.com") ||
        (url.origin !== self.location.origin && (request.destination === "image" || request.destination === "font" || request.destination === "style")),
      handler: new StaleWhileRevalidate({
        cacheName: "external-fonts-and-images",
        plugins: [
          new CacheableResponsePlugin({
            statuses: [0, 200],
          }),
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days max
          }),
        ],
      }),
    },
    // [Rule 2: Tesseract OCR 엔진 외부 CDN 자산 (WASM, GZ, 언어데이터 고정 캐시 + 0번/200번 정상 응답 방어)]
    {
      matcher: ({ url }) =>
        url.hostname.includes("jsdelivr.net") ||
        url.hostname.includes("projectnaptha.com") ||
        url.hostname.includes("unpkg.com"),
      handler: new CacheFirst({
        cacheName: "tesseract-ocr-cdn",
        plugins: [
          new CacheableResponsePlugin({
            statuses: [0, 200],
          }),
          new ExpirationPlugin({
            maxEntries: 32,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
          }),
        ],
      }),
    },
    // [Rule 3: 프로젝트 내부 static 고정 자산 (/_next/static/* 등 내부 도메인만 1년 CacheFirst 유지)]
    {
      matcher: ({ url }) =>
        url.origin === self.location.origin &&
        (url.pathname.startsWith("/_next/static/") ||
         /\.(?:js|css|woff2?|eot|ttf|otf|png|jpg|jpeg|gif|webp|svg|ico|wasm|gz|traineddata)$/i.test(url.pathname)),
      handler: new CacheFirst({
        cacheName: "internal-static-assets",
        plugins: [
          new CacheableResponsePlugin({
            statuses: [0, 200],
          }),
          new ExpirationPlugin({
            maxEntries: 256,
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
    },
    {
      matcher: /.*/i,
      handler: new StaleWhileRevalidate({
        cacheName: "fallback-catch-all",
      }),
    }
  ],
});

serwist.addEventListeners();

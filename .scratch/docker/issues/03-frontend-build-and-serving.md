# How the frontend is built and served

Type: grilling
Status: resolved
Blocked by: 01

## Question

How does the frontend become files the backend can serve, and how does the backend serve them? Which SvelteKit adapter replaces `adapter-auto`; whether the one route is prerendered or served as an SPA fallback, and whether SSR stays on; where the built files live in the image; and how FastAPI serves them next to the API (mount point, unknown paths, caching of hashed assets). The current dev workflow must keep working.

## Answer

Settled by grilling on 2026-11-11, from the facts in [Serving a static SvelteKit build from FastAPI](01-serving-static-sveltekit-from-fastapi.md).

- **Adapter: `@sveltejs/adapter-static@^3`**, replacing `adapter-auto`. The pin matters: 4.x needs SvelteKit 3. Upgrading to SvelteKit 3 is out of scope.
- **The one route is prerendered with SSR on** (`prerender = true` in a new root `+layout.ts`). `index.html` carries the full app shell, the library is still fetched in the browser after hydration, and dev keeps rendering on the server as it does today. Browser-only code outside a `browser` guard now fails the build, which the CI image build catches.
- **FastAPI serves the build with `app.frontend("/", ...)`**, so API routes always win whatever the order and trailing-slash redirects keep working.
- **Unknown paths return 404** (`fallback=None`). A fallback only matters once the app has URLs of its own, which would be its own decision.
- **The backend serves a frontend only when `FRONTEND_DIR` is set.** Unset — as in dev and in most tests — it serves the API alone, exactly as today. The Dockerfile sets it; where the files sit in the image belongs to [Image build](05-image-build.md).
- **Caching headers from a small middleware**: hashed files under `/_app/immutable/` get `public, max-age=31536000, immutable`; the page gets `no-cache`, so a rebuilt container never leaves a browser holding a page that points at deleted chunks (revalidation is a cheap `304` on the existing ETag).
- **No compression, default bundling, HTTP/1.1 accepted.** Starlette's gzip middleware would also touch `audio/mpeg` Range responses, and the build is about 308 KB on a home network.

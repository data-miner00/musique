# Serving a static SvelteKit build from FastAPI

Type: research
Status: resolved

## Question

What do the primary sources say about building this SvelteKit app as static files and serving them from FastAPI? Facts the frontend-serving and URL-layout decisions wait on:

- `@sveltejs/adapter-static` (for the SvelteKit 2.x in `frontend/package.json`): prerendering a single route versus an SPA `fallback` page, what `ssr` and `prerender` settings each needs, and what the build output looks like.
- What a prerender at build time does with code that runs only in the browser — this app's store fetches the library inside a `browser` guard.
- How `$env/static/public` behaves at build: is the value inlined, must it be defined, and is an empty string allowed — i.e. can the build point the API at the page's own origin?
- Vite dev-server proxying, as an alternative to an absolute API base URL in dev.
- Starlette/FastAPI `StaticFiles`: `html=True`, mounting at `/` alongside API routes (which wins), SPA fallback options, and caching headers for SvelteKit's hashed `_app/immutable` assets.

## Answer

Researched 2026-11-11 by a `/research` subagent, with builds and `TestClient` probes on a scratchpad copy; full findings with citations in [`research/serving-static-sveltekit-from-fastapi.md`](../research/serving-static-sveltekit-from-fastapi.md). The facts the later decisions lean on most:

- **Install `@sveltejs/adapter-static@^3`.** The unpinned package is now 4.x, which needs SvelteKit 3 and fails to install against this repo's Kit 2. Adapter options go in `sveltekit({...})` in `vite.config.ts`; `prerender`/`ssr` need a new root `+layout.ts`. adapter-static won't build until one of the two modes is chosen, and `adapter-auto` produces nothing deployable today.
- **Prerender with SSR on** gives a full app shell in `index.html`; the library isn't fetched at build thanks to the `browser` guard, but any future unguarded browser code breaks the build. **SPA mode** (`ssr = false` + `fallback`) gives an empty shell only.
- **`$env/static/public` is inlined at build and must be defined**, but an empty value works and makes every request same-origin (`/tracks`, `/stream/<id>`). A real environment variable beats a local `.env`.
- **Vite's dev proxy works**, Range requests included, so dev could use same-origin paths too and a phone on the LAN would only need to reach Vite.
- **FastAPI 0.138+ has `app.frontend("/", directory=...)`** (present in the locked 0.139.2): API routes always win regardless of order, with a choice of fallback for unknown paths. Mounting `StaticFiles(html=True)` at `/` also works but must come after the API routes and swallows trailing-slash redirects. Either way, the "Hello, World" `GET /` must go for the frontend to be served at `/`.
- **No caching headers by default.** SvelteKit's own adapters mark `/_app/immutable/` as cacheable for a year and HTML as `no-cache`; a small middleware adds the same.

Left open in the file: whether unknown paths return 404 or the page, compression, uvicorn being HTTP/1.1 only, and keeping a local `.env` out of the Docker build.

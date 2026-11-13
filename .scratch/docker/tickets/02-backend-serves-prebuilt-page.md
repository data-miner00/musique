# 02 — The backend serves the prebuilt page

**What to build:** `npm run build` produces a prerendered page, and uvicorn alone can then serve the whole app on one port: pointed at that build through `FRONTEND_DIR`, the backend serves the page at `/` and the API under `/api`, with caching headers that keep repeat visits fast and never leave a browser on a stale page after a rebuild. Without `FRONTEND_DIR`, the backend behaves exactly as after ticket 01. No Docker involved yet.

**Blocked by:** 01 — The API moves under `/api`, reached through the dev proxy

**Status:** done

Spec: [Containerize Musique with Docker](../spec.md), "Backend" and "Frontend" sections. Decisions: [How the frontend is built and served](../issues/03-frontend-build-and-serving.md); facts: [Serving a static SvelteKit build from FastAPI](../issues/01-serving-static-sveltekit-from-fastapi.md).

Frontend build

- [x] `@sveltejs/adapter-static` pinned to `^3` replaces `adapter-auto` (4.x needs SvelteKit 3 and won't install).
- [x] The app's one route is prerendered with SSR on: `npm run build` writes an `index.html` that already contains the app shell (header and navigation) plus hashed assets under `_app/immutable/`.
- [x] The Library is still fetched, and saved state still restored, in the browser after hydration — the build does not call the API.
- [x] `npm run dev` still renders on the server and behaves as before.

Backend serving

- [x] With `FRONTEND_DIR` set to a build folder, `/` serves the page, files under it are served, and every `/api/...` route still answers as before.
- [x] `/api/tracks/` still redirects to `/api/tracks`.
- [x] An unknown path, such as `/nope`, returns 404 — not the page.
- [x] Hashed files under `/_app/immutable/` are sent with `Cache-Control: public, max-age=31536000, immutable` (on `200` and `304`); the page is sent with `Cache-Control: no-cache`.
- [x] With `FRONTEND_DIR` unset, the backend serves the API only and `/` returns 404, exactly as after ticket 01.

Tests and checks

- [x] Backend HTTP tests, with `FRONTEND_DIR` pointed at a temporary folder holding an `index.html` and a file under `_app/immutable/`, cover each serving and caching box above, plus the unset case.
- [x] Driving the real app — `npm run build`, then uvicorn with `FRONTEND_DIR` pointed at the build — the full player works at `http://localhost:8000`: the Library loads, tracks play and seek, and remembered state survives a reload.
- [x] `uv run pytest`, `npm run test`, `npm run check` and `npm run lint` pass.

## Comments

Implemented test-first at the agreed backend HTTP seam. Details settled during the work:

- The Cache-Control headers come from a small plain ASGI middleware, not `@app.middleware("http")`, so audio streams pass straight through. Both it and `app.frontend()` are added only when `FRONTEND_DIR` is set; without it the app is exactly the API-only app from ticket 01.
- `/index.html` counts as the page too, and a revalidated page (`304`) keeps `no-cache`, as a hashed asset's `304` keeps its immutable header.
- `@sveltejs/adapter-static` resolved to 3.0.11; removing `adapter-auto` also pruned `yaml`, which only it used.
- The test fixtures became a `make_client` factory in `conftest.py`; the frontend build fixtures live in `test_frontend.py`.

Verified on 2026-11-12: `uv run pytest` (31 tests, 10 new), `npm run test` (39), `svelte-check` (0 errors), `prettier` and `eslint` (clean). `npm run build` writes a 308 KB `build/` whose prerendered `index.html` carries the app shell ("MUSIQUE", search) but no Library data. With uvicorn alone serving it (`FRONTEND_DIR=../frontend/build`, two generated silent mp3s): `/` and `/index.html` answer `no-cache`, hashed assets `public, max-age=31536000, immutable`, `/api/tracks` no Cache-Control, `/nope` 404. In headless Chromium at `http://localhost:8000`: the Library loads, a track plays, seeks +5 s and advances, a reload restores the second song paused at its position, every request stays on port 8000 under `/api`, streams answer `206`, and there are no console errors or warnings. `npm run dev` still renders the shell on the server, also without console errors.

As before, the Svelte MCP tools weren't loaded in the session; no `.svelte` files changed.

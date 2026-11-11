# 02 — The backend serves the prebuilt page

**What to build:** `npm run build` produces a prerendered page, and uvicorn alone can then serve the whole app on one port: pointed at that build through `FRONTEND_DIR`, the backend serves the page at `/` and the API under `/api`, with caching headers that keep repeat visits fast and never leave a browser on a stale page after a rebuild. Without `FRONTEND_DIR`, the backend behaves exactly as after ticket 01. No Docker involved yet.

**Blocked by:** 01 — The API moves under `/api`, reached through the dev proxy

**Status:** ready

Spec: [Containerize Musique with Docker](../spec.md), "Backend" and "Frontend" sections. Decisions: [How the frontend is built and served](../issues/03-frontend-build-and-serving.md); facts: [Serving a static SvelteKit build from FastAPI](../issues/01-serving-static-sveltekit-from-fastapi.md).

Frontend build

- [ ] `@sveltejs/adapter-static` pinned to `^3` replaces `adapter-auto` (4.x needs SvelteKit 3 and won't install).
- [ ] The app's one route is prerendered with SSR on: `npm run build` writes an `index.html` that already contains the app shell (header and navigation) plus hashed assets under `_app/immutable/`.
- [ ] The Library is still fetched, and saved state still restored, in the browser after hydration — the build does not call the API.
- [ ] `npm run dev` still renders on the server and behaves as before.

Backend serving

- [ ] With `FRONTEND_DIR` set to a build folder, `/` serves the page, files under it are served, and every `/api/...` route still answers as before.
- [ ] `/api/tracks/` still redirects to `/api/tracks`.
- [ ] An unknown path, such as `/nope`, returns 404 — not the page.
- [ ] Hashed files under `/_app/immutable/` are sent with `Cache-Control: public, max-age=31536000, immutable` (on `200` and `304`); the page is sent with `Cache-Control: no-cache`.
- [ ] With `FRONTEND_DIR` unset, the backend serves the API only and `/` returns 404, exactly as after ticket 01.

Tests and checks

- [ ] Backend HTTP tests, with `FRONTEND_DIR` pointed at a temporary folder holding an `index.html` and a file under `_app/immutable/`, cover each serving and caching box above, plus the unset case.
- [ ] Driving the real app — `npm run build`, then uvicorn with `FRONTEND_DIR` pointed at the build — the full player works at `http://localhost:8000`: the Library loads, tracks play and seek, and remembered state survives a reload.
- [ ] `uv run pytest`, `npm run test`, `npm run check` and `npm run lint` pass.

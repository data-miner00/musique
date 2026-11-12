# 01 — The API moves under `/api`, reached through the dev proxy

**What to build:** The player works exactly as before in dev, but every API call is a same-origin `/api/...` request. In dev, Vite forwards those requests to uvicorn, so the frontend needs no `.env`, and testing from a phone on the home network is just `npm run dev -- --host` with uvicorn left on localhost. The backend answers only under `/api`, sends no CORS headers, and no longer has a "Hello, World" page at `/`.

**Blocked by:** None — can start immediately

**Status:** done

Spec: [Containerize Musique with Docker](../spec.md), "Backend" and "Frontend" sections. Decisions: [URL layout and the API address](../issues/04-url-layout-and-api-address.md).

Backend

- [x] The track list, playlists, a playlist's tracks, the stream and the health check answer under `/api` (`/api/tracks`, `/api/playlists`, `/api/playlists/{id}/tracks`, `/api/stream/{id}`, `/api/health`), with the same response shapes as today.
- [x] FastAPI's interactive docs and schema are at `/api/docs` and `/api/openapi.json`.
- [x] The old root paths (`/tracks`, `/stream/{id}`, …) and the "Hello, World" `GET /` are gone and return 404.
- [x] The CORS middleware is removed; responses carry no CORS headers.
- [x] Range requests on `/api/stream/{id}` still return `206` with the requested bytes.

Frontend

- [x] The frontend fetches the Library and streams tracks from same-origin `/api/...` paths.
- [x] `PUBLIC_API_BASE_URL` and the frontend's `.env.example` are removed; a fresh clone runs `npm run dev`, `npm run check` and `npm run build` with no `.env` file.
- [x] In dev, Vite forwards `/api` to `http://localhost:8000`, Range requests included, so seeking works; `vite preview` forwards it too.
- [x] From a phone on the home network, `npm run dev -- --host` serves the full, playing app while uvicorn stays bound to localhost.
- [x] Player behaviour is unchanged: playback, seeking, queue, shuffle, repeat, shortcuts and remembered state all work as before.

Docs and tests

- [x] The backend and frontend READMEs drop the LAN-IP instructions and describe phone testing as `npm run dev -- --host`.
- [x] The existing backend HTTP tests use the `/api/...` paths; new cases check that `/api/docs` is reachable, that no CORS headers are sent, and that `/` returns 404.
- [x] `uv run pytest`, `npm run test`, `npm run check` and `npm run lint` pass.

## Comments

Implemented test-first at the agreed backend HTTP seam. Details settled during the work:

- FastAPI's ReDoc page moved to `/api/redoc` along with `/api/docs` and `/api/openapi.json`, so nothing at all is served outside `/api`; a test pins that the old root paths (`/`, `/tracks`, `/playlists`, `/stream/…`, `/health`, `/docs`, `/redoc`, `/openapi.json`) return 404.
- `frontend/.gitignore` lost its now-pointless `!.env.example` exception.
- The Vite proxy targets `http://localhost:8000`, as the spec says. Node 20+ falls back from `::1` to `127.0.0.1` on its own, so this works with uvicorn's default `127.0.0.1` bind.

Verified on 2026-11-12: `uv run pytest` (21 tests, 11 of them new or moved to `/api`), `npm run test` (39), `svelte-check` (0 errors), `prettier` and `eslint` (clean), and `npm run build` with no `.env`. End to end in headless Chromium against `uv run uvicorn` bound to localhost and `npm run dev -- --host`, using two generated 10-second silent mp3s: the Library loads via `localhost:5173` and via the LAN address; a track plays, seeks +5 s and advances to the next; a reload restores the second song paused at its position; every API request goes to the page's own origin under `/api` (none to `:8000`); stream requests answer `206`; uvicorn itself is unreachable from the LAN address. `vite preview` also forwards `/api` (200).

Not verified on a physical phone: the LAN check used the machine's own LAN address from the same machine.

As before, the Svelte MCP autofixer wasn't needed — no `.svelte` files changed.

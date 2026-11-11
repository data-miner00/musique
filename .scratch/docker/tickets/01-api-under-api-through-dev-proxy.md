# 01 — The API moves under `/api`, reached through the dev proxy

**What to build:** The player works exactly as before in dev, but every API call is a same-origin `/api/...` request. In dev, Vite forwards those requests to uvicorn, so the frontend needs no `.env`, and testing from a phone on the home network is just `npm run dev -- --host` with uvicorn left on localhost. The backend answers only under `/api`, sends no CORS headers, and no longer has a "Hello, World" page at `/`.

**Blocked by:** None — can start immediately

**Status:** ready

Spec: [Containerize Musique with Docker](../spec.md), "Backend" and "Frontend" sections. Decisions: [URL layout and the API address](../issues/04-url-layout-and-api-address.md).

Backend

- [ ] The track list, playlists, a playlist's tracks, the stream and the health check answer under `/api` (`/api/tracks`, `/api/playlists`, `/api/playlists/{id}/tracks`, `/api/stream/{id}`, `/api/health`), with the same response shapes as today.
- [ ] FastAPI's interactive docs and schema are at `/api/docs` and `/api/openapi.json`.
- [ ] The old root paths (`/tracks`, `/stream/{id}`, …) and the "Hello, World" `GET /` are gone and return 404.
- [ ] The CORS middleware is removed; responses carry no CORS headers.
- [ ] Range requests on `/api/stream/{id}` still return `206` with the requested bytes.

Frontend

- [ ] The frontend fetches the Library and streams tracks from same-origin `/api/...` paths.
- [ ] `PUBLIC_API_BASE_URL` and the frontend's `.env.example` are removed; a fresh clone runs `npm run dev`, `npm run check` and `npm run build` with no `.env` file.
- [ ] In dev, Vite forwards `/api` to `http://localhost:8000`, Range requests included, so seeking works; `vite preview` forwards it too.
- [ ] From a phone on the home network, `npm run dev -- --host` serves the full, playing app while uvicorn stays bound to localhost.
- [ ] Player behaviour is unchanged: playback, seeking, queue, shuffle, repeat, shortcuts and remembered state all work as before.

Docs and tests

- [ ] The backend and frontend READMEs drop the LAN-IP instructions and describe phone testing as `npm run dev -- --host`.
- [ ] The existing backend HTTP tests use the `/api/...` paths; new cases check that `/api/docs` is reachable, that no CORS headers are sent, and that `/` returns 404.
- [ ] `uv run pytest`, `npm run test`, `npm run check` and `npm run lint` pass.

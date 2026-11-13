# URL layout and the API address

Type: grilling
Status: resolved
Blocked by: 03

## Question

Once the frontend and the API share one origin, how are URLs laid out and how does the frontend find the API? Whether the API moves under an `/api` prefix; what replaces the absolute `PUBLIC_API_BASE_URL` in the container build, and how `npm run dev` still reaches `uv run uvicorn` (base URL versus a dev proxy, and LAN testing from a phone); whether CORS stays open; what happens to the "Hello, World" `GET /`; and whether `/docs` stays reachable in the container.

## Answer

Settled by grilling on 2026-11-11, building on [How the frontend is built and served](03-frontend-build-and-serving.md) and the facts in [Serving a static SvelteKit build from FastAPI](01-serving-static-sveltekit-from-fastapi.md).

- **The whole API moves under `/api`**: `/api/tracks`, `/api/playlists`, `/api/playlists/{id}/tracks`, `/api/stream/{id}`, `/api/health`, and FastAPI's `/api/docs` and `/api/openapi.json`. The page keeps `/` to itself, and any URLs the app later gains can't collide with API routes.
- **The "Hello, World" `GET /` is removed.** It would shadow the page. Without a frontend build (dev), `/` on the backend is a 404.
- **The frontend always calls same-origin `/api/...`.** In the container, FastAPI answers both the page and the API on one port.
- **In dev, Vite's `server.proxy` forwards `/api` to `http://localhost:8000`** (Range requests included; `vite preview` inherits it). The target is fixed to match the backend README; configurable only if that's ever needed.
- **`PUBLIC_API_BASE_URL` and the frontend's `.env` / `.env.example` go away**, and so does the open CORS middleware: every request is same-origin.
- **Testing from a phone on the LAN** becomes `npm run dev -- --host`; uvicorn stays on localhost and no `.env` edit is needed. Both READMEs drop their LAN-IP instructions.
- **`/api/docs` stays reachable** in the container — handy for debugging, harmless on a single-user home network.
- The day-to-day commands are unchanged: `npm run dev` and `uv run uvicorn main:app --reload`.

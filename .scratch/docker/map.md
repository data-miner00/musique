# Containerize the app with Docker

Type: wayfinder:map

## Destination

An implementation-ready **spec** at [`spec.md`](spec.md) for packaging Musique as one Docker image plus a compose file. Following it, `docker compose up --build` on any Linux machine with Docker serves the whole app on one port, playing the music folder mounted read-only.

## Notes

- Domain: personal, single-user, self-hosted music player. Backend: FastAPI + `mutagen`, managed with uv. Frontend: SvelteKit (one route, no server-only code). Use the glossary terms in [`CONTEXT.md`](../../CONTEXT.md): **Music folder** and **Library**.
- Consult `docs/agents/domain.md` and `docs/agents/issue-tracker.md` for this repo's conventions. Grilling issues use `/grilling` and `/domain-modeling`.
- Fixed constraints, not to be reopened (settled while charting on 2026-11-11):
  - **One container**: the backend serves the API and the built frontend. No separate frontend server.
  - **The music folder is mounted read-only.**
  - **No reverse proxy.** The app stays on the home network, possibly over Tailscale.
  - **The dev workflow keeps working as it is**: `npm run dev` plus `uv run uvicorn`, inside the nix shell.
  - **`MUSIC_DIR` is configurable**: the Dockerfile defaults it to `/music` and compose can override it. The host's music folder is chosen through a variable in a `.env` file beside the compose file.
  - **Host-agnostic**: the target machine isn't chosen yet, so the spec assumes "clone the repo on any Linux machine with Docker and build there".
  - **CI builds the image** on each push and PR, without publishing it.
- Test seams for the spec (agreed 2026-11-11):
  - **The existing backend HTTP seam** (`TestClient` in `backend/tests/test_main.py`) gains cases for the built frontend being served and API routes still winning.
  - **One new seam: a container smoke test in CI.** Build the image, run it with a tiny sample music folder mounted read-only, and check over HTTP that `/health` answers, the page loads, the track list shows the sample track, and a Range request on its stream returns `206`.
  - The frontend unit tests are unchanged: containerizing changes no player behaviour.
- Decisions are made with the owner, one grilling issue at a time — not decided by the agent and handed over in the spec (settled 2026-11-11).

## Decisions so far

<!-- the index — one line per resolved issue: enough to judge relevance, then zoom the link for the detail the issue holds -->

- [Serving a static SvelteKit build from FastAPI](issues/01-serving-static-sveltekit-from-fastapi.md) — `adapter-static@^3` (4.x needs Kit 3); prerender or SPA mode, both work for the one route; empty `PUBLIC_API_BASE_URL` gives same-origin requests; Vite dev proxy works; FastAPI's `app.frontend()` serves the build with API routes winning; `GET /` must go; caching headers need adding.
- [Packaging a uv-managed FastAPI app in Docker](issues/02-packaging-uv-fastapi-in-docker.md) — virtual uv project run as `uvicorn main:app`; locked no-dev dependency layer; no compilers needed; scan runs before the port opens; one worker; urllib health check; nested `.dockerignore` paths need `**/`.
- [How the frontend is built and served](issues/03-frontend-build-and-serving.md) — `adapter-static@^3`, one route prerendered with SSR on; FastAPI's `app.frontend()` serves it when `FRONTEND_DIR` is set; unknown paths 404; immutable caching for hashed assets, `no-cache` for the page.
- [URL layout and the API address](issues/04-url-layout-and-api-address.md) — whole API under `/api` (docs and health included); `GET /` removed; frontend always calls same-origin `/api`, Vite proxies it to uvicorn in dev; `PUBLIC_API_BASE_URL`, frontend `.env` and CORS removed.
- [Image build](issues/05-image-build.md) — `node:22-slim` build stage + `python:3.12-slim-trixie` runtime, uv (pinned to the nix shell's version) only at build time; `/app`, `/app/frontend`, `/music`; non-root `musique` 1000:1000; exec-form uvicorn, one worker; denylist `.dockerignore`; CI builds and runs a bash smoke test.
- [Compose file and configuration](issues/06-compose-and-configuration.md) — `.env` holds `MUSIC_FOLDER` (required), `MUSIQUE_PORT`, `MUSIQUE_UID/GID`; read-only long-syntax mount that refuses a missing path; `MUSIC_DIR: /music` shown in compose; `unless-stopped`; Dockerfile health check with a 10-minute start period; root `.env.example` and README.
- [Write the containerization spec](issues/07-write-the-spec.md) — spec published to [`spec.md`](spec.md); smoke-test sample corrected to a tiny real mp3.

## Not yet specified

(none — destination reached, no open issues remain)

## Out of scope

- Auth, HTTPS and exposing the app to the internet — the app stays on the home network (settled while charting).
- A containerized dev workflow with live reload — the image is only for running the app (settled while charting).
- A `data` volume for SQLite — nothing is stored on the server yet; it arrives with SQLite (settled while charting).
- Rescanning the library without a restart — after changing the music folder, `docker compose restart`; a rescan is its own feature (settled while charting).
- Upgrading to SvelteKit 3 / adapter-static 4 — a framework upgrade, not packaging; see [How the frontend is built and served](issues/03-frontend-build-and-serving.md).
- Compression and HTTP/2 — a ~308 KB build on a home network doesn't need them, and gzip would touch audio Range responses; see [How the frontend is built and served](issues/03-frontend-build-and-serving.md).
- Publishing the image to a registry and multi-architecture builds — building on the target machine works everywhere, ARM included; how images reach the machine is a later effort once it's chosen; see [Write the containerization spec](issues/07-write-the-spec.md).

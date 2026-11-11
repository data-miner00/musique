# Compose file and configuration

Type: grilling
Status: resolved
Blocked by: 05

## Question

What does `docker-compose.yml` declare, and how does the owner configure it? The published port and which interface it binds to; the read-only mount of the music folder and the `.env` variable that names it on the host; any `MUSIC_DIR` override; restart policy; the health check and how long a large library's startup scan may take before it counts as unhealthy; file permissions when the music folder belongs to a host user; and what `.env.example` and the README tell the owner to do.

## Answer

Settled by grilling on 2026-11-11, from the facts in [Packaging a uv-managed FastAPI app in Docker](02-packaging-uv-fastapi-in-docker.md) and building on [Image build](05-image-build.md). Everything the owner normally changes lives in a `.env` beside `docker-compose.yml`, so the compose file itself is never edited.

- **Port**: `${MUSIQUE_PORT:-8000}:8000`, on every interface so a phone on the home network reaches it. Docker-published ports bypass host firewalls such as `ufw` — normal for Docker and fine for a home-network app.
- **Music folder mount**: `.env` names the host folder as `MUSIC_FOLDER` (the glossary term), required — compose stops with "set MUSIC_FOLDER in .env" when it's missing. Long syntax with `read_only: true` and `create_host_path: false`, so a mistyped path fails at startup instead of Docker silently creating an empty folder. `MUSIC_DIR` stays the code's name for the in-container path.
- **`MUSIC_DIR` in compose**: shown explicitly as `environment: MUSIC_DIR: /music` next to the mount's `target: /music`, with a comment that they change together. Nothing extra in `.env`.
- **Restart policy**: `unless-stopped` — back after a crash or reboot, not after `docker compose stop`.
- **Health check, defined in the Dockerfile** so a plain `docker run` gets it too: a `python -c` urllib probe of `/api/health`, every 30 s, 5 s timeout, 3 retries, with a 10-minute start period probed every 5 s. A large library's scan on a slow disk isn't flagged; a small one is healthy within seconds. Unhealthy is a status in `docker ps` only — Compose doesn't act on it. `/api/health` stays "ok" for an empty library: with `create_host_path: false` a missing folder already fails at startup.
- **User**: `user: "${MUSIQUE_UID:-1000}:${MUSIQUE_GID:-1000}"`, so a music folder owned by someone other than 1000 is a `.env` change, not a rebuild. Unreadable files are still skipped silently apart from a "Skipping unreadable mp3 file" log line.
- **Docs**: a root `.env.example` (`MUSIC_FOLDER` required with an example path; `MUSIQUE_PORT`, `MUSIQUE_UID`, `MUSIQUE_GID` commented at their defaults). A new root `README.md` with a short "Run it with Docker" section — copy `.env.example` to `.env` and set `MUSIC_FOLDER`; `docker compose up -d --build`; open `http://<machine>:8000`; `docker compose restart` after adding music; `git pull` then `docker compose up -d --build` to update; what to check when tracks are missing — linking to the backend and frontend READMEs for development. Both existing READMEs lose their LAN-IP instructions; phone testing becomes `npm run dev -- --host`.

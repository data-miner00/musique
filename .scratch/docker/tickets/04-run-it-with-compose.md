# 04 — Running it with compose

**What to build:** On any Linux machine with Docker, the owner clones the repo, copies `.env.example` to `.env`, names their music folder, and runs `docker compose up -d --build`. The whole app is then on one port for every device on the home network, plays the music folder read-only, refuses to start on a missing or mistyped music-folder path, and comes back after a crash or reboot. Everything the owner normally changes lives in `.env`, and the root README walks them through it.

**Blocked by:** 03 — A Docker image, checked by a smoke test in CI

**Status:** ready

Spec: [Containerize Musique with Docker](../spec.md), "Compose" and "Configuration and docs" sections. Decisions: [Compose file and configuration](../issues/06-compose-and-configuration.md).

Compose

- [ ] With `.env` naming the music folder as `MUSIC_FOLDER`, `docker compose up -d --build` builds the image and serves the app at `http://<machine>:8000` to any device on the home network.
- [ ] Without `MUSIC_FOLDER`, compose refuses to start with "set MUSIC_FOLDER in .env".
- [ ] A mistyped `MUSIC_FOLDER` fails at startup instead of Docker creating an empty folder.
- [ ] The music folder is mounted read-only at `/music`; the compose file shows `MUSIC_DIR: /music` next to the mount target, with a comment that they change together.
- [ ] `MUSIQUE_PORT` in `.env` changes the published port (default 8000).
- [ ] `MUSIQUE_UID` / `MUSIQUE_GID` in `.env` change the user the app runs as (default 1000:1000), without a rebuild.
- [ ] The app comes back after a crash or a reboot, and stays stopped after `docker compose stop`.
- [ ] After adding music, `docker compose restart` shows it in the Library.
- [ ] No data volume, init process or health-check override is declared; the image's health check applies.

Configuration and docs

- [ ] A root `.env.example` lists `MUSIC_FOLDER` (required, with an example path) and `MUSIQUE_PORT`, `MUSIQUE_UID`, `MUSIQUE_GID` commented out at their defaults.
- [ ] A root `.gitignore` ignores `.env`.
- [ ] A new root README has a short "Run it with Docker" section: set up `.env`, `docker compose up -d --build`, open `http://<machine>:8000`, `docker compose restart` after adding music, `git pull` then `docker compose up -d --build` to update, and what to check when tracks are missing (file permissions, `MUSIQUE_UID` / `MUSIQUE_GID`). It links to the backend and frontend READMEs for development.
- [ ] `TODO.md`'s Phase 0 Docker items (Dockerfile, compose file, music-folder path convention) are ticked.

Owner's checklist (the agent can't reach the Docker daemon on the dev machine)

- [ ] On a real machine with the real music folder: `docker compose up -d --build`, then open the app from a laptop and a phone on the home network; the Library loads, tracks play and seek.
- [ ] `docker ps` shows the container healthy once the scan finishes.
- [ ] Unset `MUSIC_FOLDER`, then mistype it: compose refuses to start each time.
- [ ] `docker compose restart` after adding a track shows it; a reboot brings the app back.

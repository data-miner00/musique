# TODO — Self-hosted Music Player

Personal, single-user, Dockerized, web-based music player. Optimized for simplicity.

## Architecture decisions (locked in)
- One app container: backend serves API + streams audio + serves built frontend static files (no separate frontend server).
- Backend: FastAPI (Python) or Express (Node) — **TBD, pick one before starting**.
- Frontend: React + Vite SPA, built into static assets at image-build time.
- DB: SQLite (single file, no Postgres).
- Storage: music folder mounted read-only; separate volume for SQLite + cache data.
- Metadata: `mutagen` (Python) or `music-metadata` (Node) for ID3/tag reading.
- Transcoding: none for v1 — serve files as-is. Add ffmpeg later only if needed.
- Auth: single username/password from env vars + session cookie. No OAuth/JWT.
- Reverse proxy: skip for LAN-only use. Add Caddy later only if exposing to internet.
- No Redis, no job queue, no worker containers.

## Phase 0 — Setup
- [ ] Decide backend language: FastAPI vs Express
- [ ] Init backend project structure
- [ ] Init frontend project (Vite + React)
- [ ] Write initial `Dockerfile` (multi-stage: build frontend → copy into backend image)
- [ ] Write `docker-compose.yml` with `music` (ro) and `data` volumes
- [ ] Decide music library path convention (e.g. `/music` mount)

## Phase 1 — Library scanning & metadata
- [ ] SQLite schema: tracks, albums, artists, playlists, playlist_tracks, users, sessions
- [ ] Library scan job (on startup + manual "rescan" trigger)
- [ ] Tag extraction (title, artist, album, track #, duration, year, genre, embedded cover art)
- [ ] Handle missing/incomplete tags gracefully
- [ ] Cover art extraction/caching to disk

## Phase 2 — Backend API
- [ ] Auth endpoints (login, logout, session check)
- [ ] `GET /tracks`, `/albums`, `/artists` (list + filter/search)
- [ ] `GET /stream/:trackId` with HTTP Range support (seeking)
- [ ] `GET /cover/:albumId`
- [ ] Playlist CRUD endpoints
- [ ] Search endpoint (title/artist/album)

## Phase 3 — Frontend
- [ ] Login page
- [ ] Library browser (albums/artists/tracks views)
- [ ] Search bar
- [ ] Audio player component (play/pause/seek/volume/next/prev)
- [ ] Queue management (add/remove/reorder)
- [ ] Playlist create/edit/delete UI
- [ ] Now-playing bar (persistent across navigation)
- [ ] Responsive/mobile-friendly layout

## Phase 4 — Playback quality of life
- [ ] Gapless playback / preloading next track
- [ ] Shuffle & repeat modes
- [ ] Keyboard shortcuts (space = play/pause, etc.)
- [ ] Remember playback position/queue across page reloads

## Phase 5 — Polish & deployment
- [ ] Backup strategy for SQLite file
- [ ] Env var documentation (`.env.example`)
- [ ] README with setup/run instructions
- [ ] Test on actual library (large file counts, weird tags, various formats)
- [ ] Decide if/when to expose beyond LAN (Caddy + auth hardening)

## Backlog / maybe later
- [ ] On-demand transcoding (ffmpeg) for mobile data savings
- [ ] Lyrics support
- [ ] Scrobbling (Last.fm) integration
- [ ] Multi-user support
- [ ] Mobile app / Subsonic-API compatibility layer

## Open questions
- Where does the music library actually live (path/NAS/etc.)?
- Supported audio formats (mp3/flac/etc.) — any transcoding needed even in v1?

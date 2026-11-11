# Containerize Musique with Docker

## Problem Statement

The owner can only run Musique by starting two development servers by hand inside the nix shell: Vite for the page and uvicorn for the API. Nothing about that is meant to stay running on a home machine. There is no single thing to start, nothing brings the app back after a reboot, and each server runs on its own port. Listening from a phone on the home network means editing a frontend `.env` to the machine's LAN IP and restarting uvicorn bound to every interface. The app is self-hosted in name only: it plays the owner's music folder, but only while a developer session is open.

## Solution

Musique becomes one Docker image and one compose file. On any Linux machine with Docker, the owner clones the repo and names their music folder in a `.env` file. Then they run `docker compose up -d --build`. The whole app is then served on one port (8000 by default) to any device on the home network. It plays from the music folder, mounted read-only, and comes back after a crash or reboot.

Inside the container, the backend serves the API and the prebuilt page from the same address. The frontend reaches the API on its own origin, under `/api`. Development keeps its two familiar commands. In dev, Vite forwards `/api` to uvicorn, so the frontend no longer needs a `.env` file. Testing from a phone becomes `npm run dev -- --host`. CI builds the image on every push and pull request and runs a smoke test against the running container. The image is never published.

## User Stories

**Running it**

1. As the owner, I want to start the whole app with one `docker compose up -d --build`, so that I don't have to keep two development servers open.
2. As the owner, I want to name my music folder once in a `.env` file beside the compose file, so that I never edit the compose file or the Dockerfile to point at my music.
3. As the owner, I want compose to refuse to start with a clear "set MUSIC_FOLDER in .env" message when I haven't named my music folder, so that I don't end up with an app that silently plays nothing.
4. As the owner, I want a mistyped music-folder path to fail at startup, so that Docker doesn't quietly create an empty folder and show me an empty Library.
5. As the owner, I want the music folder mounted read-only, so that the app can never change or delete my files.
6. As the owner, I want to open `http://<machine>:8000` from any device on my home network and get the full player, so that I can listen from my laptop or phone.
7. As the owner, I want the page and the music to come from the same address and port, so that there is only one thing to remember and nothing to configure per device.
8. As the owner, I want to change the published port in `.env`, so that I can move the app when 8000 is already taken on that machine.
9. As the owner, I want the app to come back by itself after a crash or a reboot, so that it is simply there when I want music.
10. As the owner, I want the app to stay stopped after I run `docker compose stop`, so that I stay in control of when it runs.
11. As the owner, I want to see new music after running `docker compose restart`, so that adding albums doesn't require a rebuild.
12. As the owner, I want to update to the latest code with `git pull` followed by `docker compose up -d --build`, so that upgrading is two commands.
13. As the owner, I want my browser to load the new version straight after a rebuild, so that I never land on a broken page that points at script files that no longer exist.
14. As the owner, I want repeat visits to load quickly, so that the player opens fast on my phone.
15. As the owner, I want the page's header and navigation to show before its scripts finish loading, so that the app doesn't flash an empty white page.
16. As the owner, I want seeking and scrubbing to work in the container just as they do in dev, so that nothing regresses when I move to Docker.
17. As the owner, I want my volume, queue and position to be remembered between visits to the containerized app, so that it behaves like the dev app I'm used to.
18. As the owner, I want `docker ps` to show the app as healthy once it has finished scanning my library, so that I can tell at a glance it's up.
19. As the owner, I want a large library on a slow disk not to be flagged unhealthy while the startup scan is still running, so that the health status means something.
20. As the owner, I want the app's log lines to appear in `docker logs` straight away, so that I can see what it's doing while it starts.
21. As the owner, I want `docker compose stop` to finish within a few seconds even mid-song, so that restarts and updates are quick.
22. As the owner, I want to set the user the app runs as through `.env`, so that a music folder owned by a different user on that machine can be read without rebuilding the image.
23. As the owner, I want the README to tell me what to check when tracks are missing, so that a permissions problem doesn't look like a bug.
24. As the owner, I want the app to run as an unprivileged user and be unable to modify its own code, so that a bug can't do more damage than reading my music.
25. As the owner, I want the API's interactive docs at `/api/docs`, so that I can poke at the backend when something looks wrong.
26. As the owner, I want a URL that isn't part of the app to return a plain 404, so that mistyped links don't pretend to be the player.
27. As the owner, I want the image to build on whichever Linux machine I choose, x86_64 or ARM, without installing compilers, so that I can decide on the machine later.
28. As the owner, I want the build to fail when the backend lockfile is out of date, so that the image always runs the dependencies I tested with.
29. As the owner, I want `.venv`, `node_modules`, any `.env` files and my local music folder kept out of the build, so that builds stay fast and no host paths or local settings end up inside the image.
30. As the owner, I want a root `.env.example` and a "Run it with Docker" README section, so that I can set it up on a new machine without rereading this spec.

**Developing it**

31. As the developer, I want `npm run dev` and `uv run uvicorn main:app --reload` to keep working as they do today, so that containerizing the app doesn't change my daily workflow.
32. As the developer, I want the frontend to need no `.env` file, so that a fresh clone runs without setup.
33. As the developer, I want to test on my phone with just `npm run dev -- --host`, so that I no longer have to edit a LAN IP into `.env` or bind uvicorn to every interface.
34. As the developer, I want the frontend to call the same `/api/...` paths in dev and in the container, so that there is one way the frontend finds the API.
35. As the developer, I want the backend to serve only the API when no frontend build is configured, so that the backend alone behaves as it does today.
36. As the developer, I want all API routes under `/api`, so that page URLs the app may gain later can never collide with API routes.
37. As the developer, I want every browser request to be same-origin, so that the open CORS setting can go.
38. As the developer, I want browser-only code outside the `browser` guard to fail the build, so that a prerendering mistake is caught on the pull request rather than in production.
39. As the developer, I want CI to build the image on every push and pull request, so that a broken Dockerfile shows up before it is merged.
40. As the developer, I want CI to start the built container and check the page, the track list and a Range request against a real sample track, so that a passing build means a working app.
41. As the developer, I want to run that same smoke test on my own machine, so that I can check a Dockerfile change before pushing.
42. As the developer, I want the image never to be published, so that nothing leaves the repo until we decide how images reach the target machine.

## Implementation Decisions

The detailed rationale for each decision lives in the issues of the [wayfinder map](map.md). The research behind them is in `research/`.

**Backend**

- **API under `/api`.** Every endpoint moves under one route group with an `/api` prefix: `/api/tracks`, `/api/playlists`, `/api/playlists/{id}/tracks`, `/api/stream/{id}` and `/api/health`. FastAPI's interactive docs and schema move to `/api/docs` and `/api/openapi.json`. Response shapes are unchanged.
- **The "Hello, World" `GET /` is removed**, so the page can be served at `/`. Without a frontend build, `/` on the backend is a 404.
- **The CORS middleware is removed.** Every request is same-origin in both dev (through the proxy) and the container.
- **Serving the frontend.** A new optional `FRONTEND_DIR` environment variable, read at import like `MUSIC_DIR`, controls this.
  - When it is set, the backend serves that folder with FastAPI's `app.frontend()` at `/`, with no fallback. API routes always win, trailing-slash redirects keep working, and unknown paths return 404.
  - When it is unset, the backend serves the API only, exactly as today.
- **Caching headers.** A small HTTP middleware sets two kinds of header:
  - `Cache-Control: public, max-age=31536000, immutable` on responses under `/_app/immutable/` with status 200 or 304;
  - `Cache-Control: no-cache` on the page (`/`, `/index.html`).

  Everything else keeps FastAPI's defaults: ETag and Last-Modified, and no `Cache-Control`.
- **Unchanged:** the music-folder scan, `MUSIC_DIR` and its `./music` default, Range support on the stream, and a single process.

**Frontend**

- **Adapter.** `@sveltejs/adapter-static@^3` replaces `adapter-auto`. The version pin matters, because 4.x needs SvelteKit 3. It is configured through the SvelteKit plugin options in the Vite config, and writes to the default `build` output folder.
- **Prerendered with SSR on.** A new root layout module exports `prerender = true`. `index.html` carries the server-rendered app shell. The library is still fetched and saved state still restored in the browser after hydration, through the existing `browser` guard.
- **API address.** The API client uses a fixed same-origin base, `/api`. The `PUBLIC_API_BASE_URL` import and the frontend's `.env.example` are removed.
- **Dev proxy.** Vite's `server.proxy` forwards `/api` to `http://localhost:8000`, Range requests included. `vite preview` inherits it. The target is fixed to match the backend README.
- **No player behaviour changes.** The store, the components and their tests are untouched.

**Image (`Dockerfile`, `.dockerignore` at the repo root; the build context is the whole repo)**

- **Frontend stage:** `node:22-slim`, matching CI.
  - It installs with `npm ci` from the lockfile, copying `.npmrc` with the manifests because it sets `engine-strict`. `NODE_ENV` is not set to production, since the build tools are devDependencies.
  - It then runs the build.
  - Only the static build output leaves this stage.
- **Runtime stage:** `python:3.12-slim-trixie`, matching `backend/.python-version`.
  - **uv** is mounted for the dependency step only, from the official uv image, pinned by tag to the nix shell's uv version (0.11.21 today). The two are bumped together.
  - **Dependency step:** a locked, no-dev sync (`uv sync --locked --no-install-project`) with bytecode compilation, copy link mode, no Python downloads, and a cache mount. It reads the lockfile and `pyproject.toml` through bind mounts. uv never lands in the final image.
  - **Layout:**
    - `/app` holds the installed packages and the backend modules, copied as `backend/*.py`, so a new module needs no Dockerfile edit. Tests aren't copied.
    - The built frontend goes in `/app/frontend`.
  - **Environment:** `FRONTEND_DIR=/app/frontend`, `MUSIC_DIR=/music`, `PYTHONUNBUFFERED=1`, and the packages' `bin` folder on `PATH`.
  - **User:** a non-root `musique` user with UID/GID 1000:1000. The app's files stay owned by root and read-only to the app.
  - **Command (exec form):** `uvicorn main:app --host 0.0.0.0 --port 8000 --timeout-graceful-shutdown 5`. One worker, no proxy headers. Port 8000 is exposed.
  - **Health check:** a `python -c` urllib probe of `http://127.0.0.1:8000/api/health` with:
    - interval 30 s, timeout 5 s, 3 retries;
    - start period 10 minutes, with a start interval of 5 s.
- **`.dockerignore`** lists what to leave out, with patterns that reach into subfolders: `**/.venv`, `**/node_modules`, `frontend/.svelte-kit`, `frontend/build`, `**/__pycache__`, `**/*.py[oc]`, `**/.env*`, `backend/music`, `music`, `.git`, `.scratch`, `docs`, `.github`.

**Compose (`docker-compose.yml` at the repo root)**

- **Service:** one service, `musique`, built from the repo root and tagged `musique`.
- **`ports`:** `${MUSIQUE_PORT:-8000}:8000` on every interface.
- **`user`:** `${MUSIQUE_UID:-1000}:${MUSIQUE_GID:-1000}`.
- **`volumes`:** one bind mount in the long syntax:
  - source `${MUSIC_FOLDER:?set MUSIC_FOLDER in .env}`, target `/music`;
  - `read_only: true` and `create_host_path: false`.
- **`environment`:** `MUSIC_DIR: /music`, with a comment that it and the mount target change together.
- **`restart`:** `unless-stopped`.
- **Left out:** a data volume, an init process, and any health check override (the Dockerfile's applies).

**Configuration and docs**

- **Root `.env.example`:** `MUSIC_FOLDER` (required, with an example path). `MUSIQUE_PORT`, `MUSIQUE_UID` and `MUSIQUE_GID` are commented out at their defaults.
- **Root `.gitignore`:** ignores `.env`. The compose `.env` holds host paths, and the repo root has no `.gitignore` today.
- **New root `README.md`:** a short "Run it with Docker" section.
  - Copy `.env.example` to `.env` and set `MUSIC_FOLDER`, then run `docker compose up -d --build` and open `http://<machine>:8000`.
  - After adding music, run `docker compose restart`. To update, run `git pull`, then `docker compose up -d --build`.
  - When tracks are missing: check that the files are readable by the container's user, and set `MUSIQUE_UID` / `MUSIQUE_GID`.
  - It links to the backend and frontend READMEs for development.
- **Backend and frontend READMEs:** they drop the LAN-IP instructions. Phone testing is `npm run dev -- --host`, with uvicorn left on localhost.

**CI**

- **A new `image` job** in the existing test workflow, on the same triggers (pushes to `master` and pull requests).
- **Build:** it checks out the repo, sets up Buildx, and builds with Docker's build-push action. It uses the GitHub Actions layer cache in `max` mode, so the Node stage and the dependency layer are cached too. The image is loaded into the runner's Docker, and it is never pushed.
- **Test:** it then runs the container smoke test script against the loaded image.
- **Unchanged:** the existing backend and frontend jobs.

## Testing Decisions

- **What a good test is here:** it drives the app from outside, over HTTP, and checks what a client sees: status codes, bodies and headers. It never checks how the backend is wired up.
- **Backend HTTP tests (existing seam).** `TestClient` integration tests against the app module.
  - **Prior art:** the current endpoint tests and their `client` fixture. That fixture reloads the app module with `MUSIC_DIR` pointed at a temporary folder and a stubbed library scan.
  - **Updates:** existing tests move to the `/api/...` paths.
  - **New cases:**
    - With `FRONTEND_DIR` pointed at a temporary folder holding an `index.html` and a file under `_app/immutable/`:
      - `/` returns the page with `no-cache`;
      - the immutable file returns `public, max-age=31536000, immutable`;
      - `/api/tracks` still returns JSON;
      - `/api/tracks/` still redirects;
      - an unknown path returns 404.
    - Without `FRONTEND_DIR`, `/` returns 404 and the API still works.
    - `/api/docs` is reachable.
    - No CORS headers are sent.
  - **Fixture:** the `client` fixture grows a way to set `FRONTEND_DIR` the same way it sets `MUSIC_DIR`.
- **Container smoke test (one new seam).** A bash script in the repo, run by the CI `image` job and runnable locally against any built image tag.
  - **Setup:** it starts the container on a temporary copy of a sample music folder, mounted read-only, on a free port.
  - **Checks:**
    - it waits, within a timeout, for `/api/health`;
    - the page at `/` returns HTML;
    - `/api/tracks` lists the sample track under its filename title;
    - a `Range: bytes=0-99` request on that track's `/api/stream/<id>` returns `206`.
  - **Afterwards:** it removes the container whether the checks passed or not, and exits non-zero on any failed check.
  - **The sample** is a tiny **real** mp3, about a second of silence and a few KB, committed as a test fixture. The real scan opens every file with `mutagen` and skips any it can't parse, so a fake mp3 would leave the Library empty. The sample has no tags, so its title falls back to its filename.
- **Frontend tests are unchanged.** Containerizing changes no player behaviour. The store tests use their own fixture stream URLs, not the API client's base. `npm run check` and the build catch a missing export or a prerendering mistake, and the CI image build runs that build.

## Out of Scope

- **Auth, HTTPS, a reverse proxy, and exposing the app to the internet.** The app stays on the home network, possibly over Tailscale.
- **A containerized dev workflow with live reload.** The image is only for running the app.
- **A `data` volume for SQLite.** Nothing is stored on the server yet; it arrives with SQLite.
- **Rescanning the library without a restart.** After changing the music folder, run `docker compose restart`. A rescan is its own feature.
- **Publishing the image to a registry, and building multi-architecture images.** Building on the target machine works everywhere, ARM included. How images reach the machine is a later effort, once the machine is chosen.
- **Upgrading to SvelteKit 3 / adapter-static 4,** and moving Node past 22.
- **Compression and HTTP/2.** The build is about 308 KB on a home network, and gzip would also touch audio Range responses.
- **An SPA fallback for unknown paths.** It only matters once the app has URLs of its own.
- **Bumping the existing CI jobs' action versions,** and making the existing backend CI job sync with `--locked`.

## Further Notes

- **Saved state is per origin.** Volume, queue and position live in the browser's `localStorage`, which is keyed by origin. State saved against the dev server (`localhost:5173`) won't appear in the container (`<machine>:8000`), and each device remembers its own, as today.
- **Docker requirements.** The health check's start interval needs Docker Engine 25 or later. The compose mount options need a current Compose v2.
- **Building on the dev machine.** Docker is installed there, but the agent's account can't reach the Docker daemon. Building and running the image, and the smoke test, need the owner or a user in the `docker` group.
- **uv versions.** Pinning the image's uv to the nix shell's version keeps `uv sync --locked` from being surprised by a newer uv's lock format. When the nix shell's uv is bumped, bump the image's pin in the same change.
- **Docker-published ports bypass host firewalls** such as `ufw`. That's expected for a home-network app, and worth knowing if the target machine has a firewall.
- **The sample mp3 has to be created once.** There is no `ffmpeg` on the dev machine, so generating a few silent MPEG frames with a short script is the easiest route. The fixture just needs to be a file `mutagen` accepts.
- **TODO.md.** This effort completes its Phase 0 Docker items. The SQLite `data` volume it mentions stays with the SQLite work.

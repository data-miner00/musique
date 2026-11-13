# Image build

Type: grilling
Status: resolved
Blocked by: 02, 03

## Question

What does the Dockerfile build, and how? The stages and their base images (Node version for the frontend build, Python version from `backend/.python-version`), how uv installs the locked backend dependencies, the user the app runs as, the command that starts uvicorn, where `MUSIC_DIR` defaults to `/music`, the `.dockerignore`, and the CI job that builds the image without publishing it.

## Answer

Settled by grilling on 2026-11-11, from the facts in [Packaging a uv-managed FastAPI app in Docker](02-packaging-uv-fastapi-in-docker.md) and building on [How the frontend is built and served](03-frontend-build-and-serving.md) and [URL layout and the API address](04-url-layout-and-api-address.md).

- **Files at the repo root**: `Dockerfile`, `.dockerignore`, `docker-compose.yml`; the build context is the whole repo, since the image needs both `frontend/` and `backend/`.
- **Two stages, uv only at build time.** A `node:22-slim` stage builds the frontend. A `python:3.12-slim-trixie` stage installs the locked, no-dev dependencies with uv mounted for that one step, then runs the app. uv never lands in the final image; the server starts from the installed packages directly.
- **uv is pinned by tag to the nix shell's version** (0.11.21 today), so the image and the `uv.lock` it reads can't disagree; the two are bumped together. Base images are pinned to `python:3.12-slim-trixie` and `node:22-slim` (Python matches `backend/.python-version`, Node matches CI); moving Node to 24/26 is a separate change made in CI and the image together.
- **Layout**: code and installed packages in `/app`; the built frontend in `/app/frontend` with `FRONTEND_DIR=/app/frontend`; `MUSIC_DIR=/music`. The Dockerfile copies `backend/*.py`, so a new backend module needs no Dockerfile edit; tests stay out of the image.
- **User**: a non-root `musique` user with fixed UID/GID 1000:1000. The app's files stay root-owned, so the app can't change its own code. Whether compose overrides the user belongs to [Compose file and configuration](06-compose-and-configuration.md).
- **Command**: exec form `uvicorn main:app --host 0.0.0.0 --port 8000 --timeout-graceful-shutdown 5`, with `PYTHONUNBUFFERED=1`. One worker (each extra one would rescan and hold its own Library), no proxy headers; the 5-second timeout lets a mid-stream `docker stop` finish cleanly before Docker's 10-second kill.
- **`.dockerignore` is a denylist** with patterns that reach into subfolders: `**/.venv`, `**/node_modules`, `frontend/.svelte-kit`, `frontend/build`, `**/__pycache__`, `**/*.py[oc]`, `**/.env*`, `backend/music`, `music`, `.git`, `.scratch`, `docs`, `.github`. It keeps the context small and keeps any `.env` (the compose one with host paths, or a stray frontend one Vite would inline) out of the build.
- **CI**: a new `image` job in `test.yml` checks out the repo, builds with Docker's build actions and the GitHub Actions layer cache (`mode=max`), loads the image without publishing it, then runs the container smoke test — a bash script in the repo, runnable locally too — against a temporary music folder holding a fake `.mp3`: wait for `/api/health`, then check the page, `/api/tracks`, and a `206` Range response from `/api/stream/<id>`. Bumping the existing jobs' action versions is out of scope.
- Noted while grilling: Docker is installed on the dev machine, but the agent's account can't reach the Docker daemon, so building and running the image needs the owner (or a user in the `docker` group).

## Comments

**Correction (2026-11-11, while writing the spec):** the smoke test can't use a *fake* `.mp3`. The real scan opens each file with `mutagen`'s `MP3()` and skips any it can't parse ("Skipping unreadable mp3 file") — the backend unit tests only accept fake bytes because they mock `MP3`. The smoke test's sample is therefore a tiny **real** mp3 (about a second of silence, a few KB) committed as a test fixture. Its title falls back to the filename, which the test checks.

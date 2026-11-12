# 03 — A Docker image, checked by a smoke test in CI

**What to build:** One Docker image holds the whole app: built from the repo, it serves the page and the API on port 8000 and plays a music folder mounted read-only at `/music`. A smoke test starts that image against a tiny real sample track and checks it over HTTP; CI builds the image on every push and pull request and runs the smoke test, without ever publishing the image.

**Blocked by:** 02 — The backend serves the prebuilt page

**Status:** in-progress

Spec: [Containerize Musique with Docker](../spec.md), "Image", "CI" and "Testing Decisions" sections. Decisions: [Image build](../issues/05-image-build.md) (including its correction comment); facts: [Packaging a uv-managed FastAPI app in Docker](../issues/02-packaging-uv-fastapi-in-docker.md).

The image

- [ ] Building the repo root produces one image from two stages: a `node:22-slim` stage that builds the frontend, and a `python:3.12-slim-trixie` runtime that holds the backend, its locked no-dev dependencies and the built page. Nothing from the Node stage but the build output reaches the runtime.
- [ ] uv, pinned by tag to the nix shell's version, is used only to install dependencies and is not in the final image; a stale lockfile fails the build.
- [ ] The build needs no compilers and works the same on x86_64 and ARM.
- [ ] A new backend module is picked up without editing the Dockerfile; tests are not in the image.
- [ ] The app runs as a non-root `musique` user (1000:1000) and cannot modify its own files.
- [ ] uvicorn is the container's main process (exec form), with one worker; `docker stop` mid-song finishes within about 5 seconds.
- [ ] Log lines appear in `docker logs` straight away.
- [ ] The image's defaults point the backend at the built page and at `/music`; port 8000 is exposed.
- [ ] The image's health check probes `/api/health` without curl: healthy within seconds for a small Library, and not flagged unhealthy during a startup scan of up to 10 minutes.
- [ ] `.venv`, `node_modules`, frontend build output, Python caches, any `.env` file, the local music folder, `.git`, `.scratch`, `docs` and `.github` are kept out of the build context, including copies inside `backend/` and `frontend/`.

Smoke test

- [x] A tiny **real** mp3 — about a second of silence, a few KB, no tags — is committed as a test fixture; the real scan accepts it (a fake mp3 would be skipped).
- [x] A bash script, runnable locally against any built image tag, starts the container with a temporary copy of the sample folder mounted read-only on a free port, and checks that:
  - [x] `/api/health` answers within a timeout;
  - [x] `/` returns the page;
  - [x] `/api/tracks` lists the sample track under its filename;
  - [x] a `Range: bytes=0-99` request on that track's `/api/stream/<id>` returns `206`.
- [x] The script removes the container whether the checks pass or fail, and exits non-zero on any failure.

CI

- [ ] A new `image` job in the test workflow, on the same triggers as the other jobs, builds the image with the GitHub Actions layer cache in `max` mode, loads it on the runner without pushing it, and runs the smoke test script.
- [ ] The job passes on the pull request. (The agent's account can't reach the Docker daemon on the dev machine, so CI — or the owner running the script locally — is the verification.)
- [x] The existing backend and frontend jobs are unchanged.

## Comments

Implemented; **waiting on a real build**. The agent's account isn't in the `docker` group, so nothing here has run `docker build` or `docker run`. The image's boxes and the CI boxes stay unticked until the `image` job (named "Docker image tests") passes on a push or PR, or the owner runs `docker build -t musique . && scripts/smoke-test.sh musique` locally.

What was verified without a daemon (2026-11-12):

- Every pinned image and action exists (anonymous registry and GitHub API lookups): `ghcr.io/astral-sh/uv:0.11.21` (the nix shell's uv), `python:3.12-slim-trixie`, `node:22-slim`, `docker/setup-buildx-action` v4 (v4.4.1 latest), `docker/build-push-action` v7 (v7.4.0 latest).
- `hadolint` 2.14 (Dockerfile), `shellcheck` 0.11 (script) and `actionlint` 1.7.12 (workflow) are clean.
- The image's dependency step, rehearsed outside Docker with uv 0.11.21 and the same flags on a copy of `pyproject.toml` and `uv.lock`, installs uvicorn and not pytest; editing `pyproject.toml` without relocking makes `--locked` fail.
- The locked uvicorn 0.51.0 accepts every flag in the image's command.
- The sample `Silence.mp3` (3952 bytes: one second of silent MPEG-1 Layer III frames at 32 kbps, 44.1 kHz, mono, no tags) passes the real scan as "Silence", 0.99 s.
- The smoke script, run against a stand-in `docker` that starts uvicorn on the prebuilt page with the mounted folder as `MUSIC_DIR` (and, like real Docker, drops the published address once the container stops): all four checks pass and it exits 0; with an empty music folder it reports two FAILs, prints the logs and exits 1; with an app that crashes on startup it reports "the container stopped" with the traceback within a second and exits 1. The container is removed every time.
- The backend (31) and frontend (39) suites, `svelte-check` and lint still pass.

Settled during the work:

- The smoke test lives at `scripts/smoke-test.sh`, with its sample in `scripts/smoke-test/`. It publishes on a Docker-chosen free port on 127.0.0.1, makes the temporary music folder world-readable for the container's user, and gives every request a timeout.
- Two small additions beyond the spec's list: `.dockerignore` also excludes `scripts` (never copied into the image), and the frontend stage's `npm ci` gets a cache mount for faster local rebuilds, just as the uv step does.


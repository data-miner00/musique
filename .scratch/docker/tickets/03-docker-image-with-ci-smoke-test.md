# 03 — A Docker image, checked by a smoke test in CI

**What to build:** One Docker image holds the whole app: built from the repo, it serves the page and the API on port 8000 and plays a music folder mounted read-only at `/music`. A smoke test starts that image against a tiny real sample track and checks it over HTTP; CI builds the image on every push and pull request and runs the smoke test, without ever publishing the image.

**Blocked by:** 02 — The backend serves the prebuilt page

**Status:** ready

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

- [ ] A tiny **real** mp3 — about a second of silence, a few KB, no tags — is committed as a test fixture; the real scan accepts it (a fake mp3 would be skipped).
- [ ] A bash script, runnable locally against any built image tag, starts the container with a temporary copy of the sample folder mounted read-only on a free port, and checks that:
  - [ ] `/api/health` answers within a timeout;
  - [ ] `/` returns the page;
  - [ ] `/api/tracks` lists the sample track under its filename;
  - [ ] a `Range: bytes=0-99` request on that track's `/api/stream/<id>` returns `206`.
- [ ] The script removes the container whether the checks pass or fail, and exits non-zero on any failure.

CI

- [ ] A new `image` job in the test workflow, on the same triggers as the other jobs, builds the image with the GitHub Actions layer cache in `max` mode, loads it on the runner without pushing it, and runs the smoke test script.
- [ ] The job passes on the pull request. (The agent's account can't reach the Docker daemon on the dev machine, so CI — or the owner running the script locally — is the verification.)
- [ ] The existing backend and frontend jobs are unchanged.

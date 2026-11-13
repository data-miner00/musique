# Packaging a uv-managed FastAPI app in Docker

Type: research
Status: resolved

## Question

What do the primary sources (uv's Docker integration guide, FastAPI's deployment docs, uvicorn's docs, Docker's docs) recommend for packaging this backend — uv-managed, `uv.lock` committed, Python pinned in `backend/.python-version` — into an image? Facts the image-build and compose decisions wait on:

- Getting uv into the image (official uv images versus copying the binary), and which Python base image to use.
- Installing from the lockfile with a cached dependency layer: `uv sync` flags for a locked, no-dev install, bytecode compilation, link mode and cache mounts.
- A multi-stage build: a Node stage that builds the frontend, then a Python runtime stage, and which files must cross between them.
- Running as a non-root user, and reading a read-only bind mount whose files belong to a host user (UID/GID).
- Running uvicorn in production: host and port, workers for a single-user app, signal handling as PID 1, proxy headers.
- A container health check against `/health` without installing curl.
- What a `.dockerignore` should exclude for this repo layout (`.venv`, `node_modules`, `.svelte-kit`, `.env`, the local `music` folder).
- Building the image in GitHub Actions without pushing, with layer caching.

## Answer

Researched 2026-11-11 by a `/research` subagent; full findings with citations in [`research/packaging-uv-fastapi-in-docker.md`](../research/packaging-uv-fastapi-in-docker.md). The facts the later decisions lean on most:

- The backend is a uv **virtual project** (no build system), so `.venv` holds only dependencies; `main.py` and `library.py` are copied in separately. `fastapi run` isn't available, so the server starts as `uvicorn main:app` in exec form.
- uv's guide gives three ways to get uv into the image (copy the pinned binary, use a uv-plus-Python image, or mount it for one step only) and a cached, locked, no-dev dependency layer. Its lock-only variant fails on this repo.
- Neither stage needs a compiler: every compiled dependency has wheels for x86_64 and arm64, and `npm ci` downloads no Playwright browsers.
- uvicorn runs the music-folder scan **before** opening its port, so a health check's start period must cover a large library's scan. One worker, since each worker rescans and keeps its own Library.
- The slim Python image has no curl; a `python -c` urllib probe works as the health check.
- The read-only mount maps no user ids: files the container's user can't read are silently left out of the Library. The short `:ro` syntax turns a mistyped host path into an empty folder; the long syntax can refuse instead.
- `.dockerignore` patterns are anchored at the context root, so nested `.venv`, `node_modules`, `.env` and the local music folder need `**/` or full paths. A stray `frontend/.env` would be baked into the build.
- CI can build without pushing using Docker's build actions with the GitHub Actions cache in `max` mode.

Left open in the file: uv version skew between the nix shell and the image, uv in or out of the final image, Node 22/24/26, the container's user id versus the host's file ownership, the startup scan's time allowance, and a CI smoke test.

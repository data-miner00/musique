# syntax=docker/dockerfile:1

# One image for the whole app: the backend serves the API under /api and the
# prebuilt frontend at /, and plays the music folder mounted at /music.
#
#   docker build -t musique .
#   docker run -p 8000:8000 --mount type=bind,source=/path/to/music,target=/music,readonly musique

# --- Frontend: build the static page -------------------------------------------
# Node 22 matches CI; move both together.
FROM node:22-slim AS frontend

WORKDIR /frontend
# .npmrc sets engine-strict, so it comes along with the manifests. NODE_ENV
# stays unset: the build tools are all devDependencies.
COPY frontend/package.json frontend/package-lock.json frontend/.npmrc ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY frontend/ ./
RUN npm run build

# --- Runtime: the backend, its locked dependencies and the built page -----------
# Python matches backend/.python-version.
FROM python:3.12-slim-trixie

# A locked, no-dev install into /app/.venv, using the image's own Python.
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_NO_DEV=1 \
    UV_PYTHON_DOWNLOADS=0

WORKDIR /app
# uv is mounted for this step only and never lands in the image. Its version
# matches the nix shell's (which writes uv.lock); bump them together.
RUN --mount=from=ghcr.io/astral-sh/uv:0.11.21,source=/uv,target=/bin/uv \
    --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=backend/uv.lock,target=uv.lock \
    --mount=type=bind,source=backend/pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project

# The backend isn't a package: its modules sit beside the virtualenv.
COPY backend/*.py ./
COPY --from=frontend /frontend/build ./frontend

# The app's files stay root-owned, so the app can't change its own code.
RUN groupadd --gid 1000 musique \
    && useradd --uid 1000 --gid 1000 --no-create-home --shell /usr/sbin/nologin musique

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    FRONTEND_DIR=/app/frontend \
    MUSIC_DIR=/music

USER musique
EXPOSE 8000

# uvicorn opens its port only after the startup scan of the music folder, so
# allow a large library on a slow disk up to 10 minutes before failures count.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10m --start-interval=5s --retries=3 \
    CMD ["python", "-c", "import sys, urllib.request; sys.exit(urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=4).status != 200)"]

# Exec form, so uvicorn gets docker's stop signal and the app shuts down
# cleanly. One worker: each extra one would rescan and hold its own Library.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--timeout-graceful-shutdown", "5"]

# Research: packaging the uv-managed FastAPI backend in Docker

Answers [`issues/02-packaging-uv-fastapi-in-docker.md`](../issues/02-packaging-uv-fastapi-in-docker.md). Read 2026-11-11. This file reports facts and trade-offs. It does not make decisions; those belong to issues 05 (image build) and 06 (compose).

Tags used below: **(repo)** means a fact read from this repository, **(checked locally)** means a small experiment on this machine, and **(inference)** means my own reasoning, not something a source says.

## Versions looked at

| Thing | Version / tag format seen |
|---|---|
| uv | latest release **0.13.7** (2026-11-03) [uv-release]. Images: `ghcr.io/astral-sh/uv:0.13.7` (distroless), `:0.13` (latest patch), `:0.13.7-python3.12-trixie-slim` (derived) [uv-docker]. The nix shell has uv 0.11.21. |
| uv-docker-example | `main` @ 2026-10-21 [uv-example] |
| Python image | `python:3.12-slim` = `3.12-slim-trixie` = **3.12.16** [py-tags]. Python 3.12 gets security fixes only, EOL 2028-10 [py-cycle]. |
| Node image | `node:22-slim` = `22-bookworm-slim` = **22.23.4**, and `22-trixie-slim` also exists. `node:lts` = **26.13.0** "Lithium" [node-hub]. Node 22 is in maintenance until its EOL on 2027-04-30. Node 24 has been in maintenance since 2026-10-20. Node 26 has been LTS since 2026-10-28 [node-sched]. |
| FastAPI docs | `master` (latest release 0.162.4). The repo locks 0.139.2. |
| uvicorn | docs `main` (latest release 0.54.0). The repo locks **0.51.0**, and the source was checked at that tag [uvi-server]. |
| Docker docs | Dockerfile reference (BuildKit `master`), Compose file reference. The docs pin `docker/build-push-action@v7`, `docker/setup-buildx-action@v4` and `actions/checkout@v6` in their examples. The latest releases are build-push-action v7.4.0, setup-buildx-action v4.4.1 and actions/checkout v7.0.1. |

## Summary

- **The backend is a uv "virtual" project.** `backend/pyproject.toml` has no `[build-system]`, and `uv.lock` records `source = { virtual = "." }` **(repo)**. uv "will not attempt to build or install the project itself, just its dependencies" [uv-build]. So `--no-install-project` and `--no-editable` change nothing here. `.venv` never contains `main.py`/`library.py`, so those files must be copied in separately.
- **There are three uv-sanctioned ways to get uv:**
  - copy `/uv` from a pinned `ghcr.io/astral-sh/uv:<ver>` into `python:3.12-slim-trixie`;
  - use the derived image `ghcr.io/astral-sh/uv:<ver>-python3.12-trixie-slim`;
  - bind-mount the binary for a single `RUN` only, so uv never lands in the image.

  uv calls pinning a version "best practice", and pinning a digest is better still for reproducibility [uv-docker].
- **Dependency layer.** Bind-mount `uv.lock` and `pyproject.toml`, put a cache mount on `/root/.cache/uv`, and run `uv sync --locked --no-install-project` with `UV_NO_DEV=1`, `UV_COMPILE_BYTECODE=1` and `UV_LINK_MODE=copy` [uv-example]. uv's default groups are `["dev"]`, so without `--no-dev` the sync would install pytest and httpx [uv-settings-groups].
- **The guide's lock-only variant failed here.** The guide also shows mounting only `uv.lock` with `--frozen`. With uv 0.11.21 that fails: `error: No pyproject.toml found` **(checked locally)**.
- **No compilers are needed in either stage.**
  - Every compiled Python dependency in `uv.lock` (pydantic-core, uvloop, httptools, watchfiles, pyyaml, websockets) has cp312 manylinux wheels for x86_64 and aarch64, plus musllinux wheels **(repo)**.
  - The npm lockfile includes glibc and musl native bindings for both x64 and arm64 (rolldown, lightningcss, tailwind oxide) **(repo)**.
  - `playwright@1.62.1` has no install script, so `npm ci` downloads no browsers [npm-pw], **(repo)**.
- **Run uvicorn directly.** Use exec form, with `.venv/bin` on `PATH`: `uvicorn main:app --host 0.0.0.0 --port 8000`, from the directory that holds `main.py`.
  - `fastapi run` is **not available**: `fastapi-cli` is not in `uv.lock` **(repo)**.
  - Exec form makes uvicorn PID 1, and it handles SIGTERM and SIGINT [uvi-server].
  - `uv run` as the `CMD` adds a uv parent process that forwards signals, and it syncs the environment before starting [uv-run].
- **Workers.** One worker is uvicorn's default. Each extra worker process would run the lifespan again, which means **scanning the music folder again and holding a separate copy of the Library** (processes "don't share any memory") [fastapi-concepts], **(repo)**.
- **No answers during the startup scan.** uvicorn runs lifespan startup (the scan) *before* binding its socket [uvi-server], so `/health` refuses connections until the scan finishes. The health check's `start_period` has to cover the worst-case scan. In plain Docker or Compose an `unhealthy` status does nothing: restart policies act only when the container exits [compose-restart].
- **Health check without curl.** The slim Python image has no curl or wget, because wget is purged after Python is built [py-slim-df]. A `python -c` probe using `urllib` exits 1 on connection refused or an HTTP error [py-urllib], [py-sys-exit], **(checked locally)**.
- **`.dockerignore` patterns are anchored at the context root.** `.venv` matches only `/.venv`, not `backend/.venv`. Use `**/` or full paths [docker-ignore]. A stray `frontend/.env` in the context would be read by Vite and inlined into the build [vite-env].
- **Non-root user.** The Python image creates no non-root user. The uv example creates `nonroot` with UID/GID 999 [uv-example]. A bind mount does no UID translation unless userns-remap is on [docker-userns], so access to the music folder follows normal Linux permissions **(inference)**. Files or folders the scan can't read are **skipped silently**: the Library is partial and nothing crashes (`library.py` catches the error; `Path.rglob` skips unreadable directories) **(repo)**, **(checked locally)**.
- **CI.** Use `setup-buildx-action@v4` and `build-push-action@v7`. `push` defaults to false. The default is a Git context, so no checkout is needed. Use `cache-from: type=gha` and `cache-to: type=gha,mode=max`: `max` is what caches the Node stage and the dependency layers, which aren't in the final image. RUN cache mounts are **not** saved to the GHA cache [docker-gha-cache], [dockerfile-ref-cache].

---

## 1. Getting uv into the image, and the Python base image

**How to get uv** [uv-docker]
- **Copy the binary from the distroless image.** `COPY --from=ghcr.io/astral-sh/uv:0.13.7 /uv /uvx /bin/`. The distroless images "do not contain anything but the uv binaries".
- **Use a derived image with uv preinstalled.** Examples: `ghcr.io/astral-sh/uv:python3.12-trixie-slim` (based on `python:3.12-slim-trixie`), `…python3.12-alpine`, and `…python3.12-dhi` (Docker Hardened Images). Version-pinned tags look like `ghcr.io/astral-sh/uv:0.13.7-python3.12-trixie-slim`. The derived images put uv in `/usr/local/bin` and set `ENTRYPOINT []` and `CMD ["/usr/local/bin/uv"]` [uv-build-docker-wf]. The example's `ENTRYPOINT []` is therefore redundant, but harmless.
- **Use the installer script** (`ADD https://astral.sh/uv/0.13.7/install.sh`). This requires curl.
- **Use uv only during the build.** `RUN --mount=from=ghcr.io/astral-sh/uv,source=/uv,target=/bin/uv uv sync`. uv is mounted for that `RUN` only and is not in the final image.
- **Pinning.** "It is best practice to pin to a specific uv version". Pinning a digest (`…/uv@sha256:…`) "is considered best practice in environments that require reproducible builds as tags can be moved". You can verify an image's provenance with `gh attestation verify --owner astral-sh oci://ghcr.io/astral-sh/uv:<tag>`.

**Python base image: the sources differ**

| Source | Base in its example |
|---|---|
| uv guide [uv-docker] | `python:3.12-slim-trixie` (also `python:3.12-slim`) |
| uv-docker-example [uv-example] | `ghcr.io/astral-sh/uv:python3.12-trixie-slim` (single stage). The multistage file uses it as builder with a `python:3.12-slim-trixie` runtime; the standalone file uses uv-managed Python on a `debian:trixie-slim` runtime. |
| uvicorn docs [uvi-docker] | `python:3.12-slim` plus `COPY --from=ghcr.io/astral-sh/uv:latest` |
| FastAPI docs [fastapi-docker] | `python:3.14` (the full, non-slim image), using **pip** with a `requirements.txt` exported by `uv export --format requirements-txt --no-dev --no-emit-project`. For uv users it points to uv's guide. |
| Python image page [py-hub] | Recommends the default (full) image "unless you are working in an environment where *only* the `python` image will be deployed and you have space constraints". The slim image "does not contain the Debian packages required to compile extension modules". |

- **Slim is enough for this lockfile.** All compiled dependencies ship cp312 wheels for x86_64 and aarch64 **(repo)**, so nothing needs compiling. The full image's extra Debian packages aren't needed **(inference)**.
- **Alpine is possible.** Every compiled dependency also has musllinux wheels **(repo)**. The Python image page warns that musl "will often run into issues depending on the depth of their libc requirements" [py-hub].
- **Match Python across stages.** The builder and runtime must use the same Python path: "using `python:3.11-slim-trixie` will fail" against a 3.12 builder [uv-example multistage]. Setting `UV_PYTHON_DOWNLOADS=0` makes uv use the system interpreter instead of downloading one.
- **`.python-version` and the first sync.** uv reads `.python-version` from the working directory and its parents as the default version request [uv-pyver]. The example mounts only `pyproject.toml` and `uv.lock`, so in that step uv picks "the first interpreter that meets the project's `requires-python`" [uv-sync-cli]. With a 3.12 base, the pin and the system interpreter agree **(inference)**. With `UV_PYTHON_DOWNLOADS=0`, a mismatch fails loudly instead of downloading a managed Python **(inference)**.
- **Bytecode for the standard library.** "The official `python` image will not have a compiled standard library". uv only compiles the standard library for *managed* Pythons [uv-docker].

## 2. Locked, no-dev install with a cached dependency layer

**Flags and their environment-variable equivalents** [uv-sync-cli], [uv-env]

| Need | Flag | Env var |
|---|---|---|
| Fail if the lock is stale ("If the lockfile is missing or needs to be updated, uv will exit with an error") | `--locked` | `UV_LOCKED` |
| Use the lock without checking it against pyproject | `--frozen` | `UV_FROZEN` |
| Skip the dev group (alias of `--no-group dev`; the default groups are `["dev"]` [uv-settings-groups]) | `--no-dev` | `UV_NO_DEV` (added in 0.8.7) |
| Install dependencies only, for the layer split | `--no-install-project` | `UV_NO_INSTALL_PROJECT` |
| Compile `.pyc` files for faster startup; "Docker containers" is the named use case | `--compile-bytecode` | `UV_COMPILE_BYTECODE` |
| Link mode: default `clone` on Linux; `copy` silences warnings when the cache mount is on another filesystem | `--link-mode copy` | `UV_LINK_MODE` |
| No cache, for when no cache mount is used | `--no-cache` | `UV_NO_CACHE` |

- `uv sync` re-locks before syncing "unless the `--locked` or `--frozen` flag is provided". It does an *exact* sync: extra packages are removed [uv-sync-cli].
- `.github/workflows/test.yml` currently runs `uv sync --all-groups` without `--locked` **(repo)**. CI would therefore re-lock silently rather than fail on a stale lock **(inference)**.

**The three published layer-split patterns differ**
- **uv guide.** Bind-mount only `uv.lock`, run `uv sync --frozen --no-install-project`, then `COPY .` and `uv sync --locked` [uv-docker]. With local uv 0.11.21, a directory holding only `uv.lock` gives `error: No pyproject.toml found in current directory or any parent directory` **(checked locally)**. I haven't checked this against 0.13.7.
- **uv-docker-example.** Bind-mount both `uv.lock` and `pyproject.toml` and use `--locked` in both steps [uv-example].
- **uvicorn docs.** Bind-mount both and use `--frozen` in both steps [uvi-docker].

**What changes for this repo** (virtual project):
- The project is never installed, so after the first sync the second `uv sync --locked` only audits the lock **(inference)**.
- Copying `main.py` and `library.py` after the dependency layer is enough to keep source edits from rebuilding the dependencies.
- `UV_COMPILE_BYTECODE` compiles site-packages ("process the entire site-packages directory") [uv-sync-cli]. `main.py` and `library.py` aren't in site-packages, so they stay uncompiled **(inference)**. That costs two small modules compiled in memory at each start.

**Cache mounts** [uv-docker], [dockerfile-ref-cache]
- The pattern is `RUN --mount=type=cache,target=/root/.cache/uv …` together with `ENV UV_LINK_MODE=copy`.
- Cache mount contents "persist between builder invocations without invalidating the instruction cache". However, they "are not included in exported build cache (`--cache-to`)". On fresh CI runners they "start empty on every build".
- For the Node stage, Docker's docs show `--mount=type=cache,target=/root/.npm`, which is npm's default cache location [docker-cache-opt].

Illustrative dependency layer, paths relative to a repo-root context:
```dockerfile
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_NO_DEV=1 UV_PYTHON_DOWNLOADS=0
WORKDIR /app
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=backend/uv.lock,target=uv.lock \
    --mount=type=bind,source=backend/pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project
COPY backend/main.py backend/library.py ./
```

## 3. Multi-stage build: Node stage, then Python runtime

**Docker facts** [docker-multistage], [docker-buildkit], [dockerfile-ref]
- Each `FROM` starts a new stage. "You can selectively copy artifacts from one stage to another, leaving behind everything you don't want in the final image."
- Stages are named with `AS` and copied from with `COPY --from=<stage>`. "The source path of `COPY --from` is always resolved from filesystem root of the image or stage."
- BuildKit "detect[s] and skip[s] executing unused build stages" and "parallelize[s] building independent build stages". The Node build and the Python dependency install can run at the same time.
- `# syntax=docker/dockerfile:1` pulls the latest stable Dockerfile frontend, which `RUN --mount` needs.

**Node stage facts for this repo**
- **Engine check.** `.npmrc` sets `engine-strict=true` **(repo)**. With that set, npm "will stubbornly refuse to install … any package that claims to not be compatible with the current Node.js version" [npm-config]. The strictest `engines` ranges in the lock are eslint's `^20.19.0 || ^22.13.0 || >=24` and vite's `^20.19.0 || >=22.12.0` **(repo)**. Node 22.23, 24 and 26 all satisfy them. CI uses Node 22 **(repo)**.
- **Copy `.npmrc` with the manifests.** The dependency layer would copy `package.json`, `package-lock.json` and `.npmrc` together **(inference)**.
- **`npm ci` requirements.** It requires `package-lock.json`, fails if the lock and `package.json` disagree, and never writes either file [npm-ci].
- **`npm ci` runs the root `prepare` script** [npm-scripts]. Here that is `svelte-kit sync || echo ''` **(repo)**. If only the manifests have been copied, sync may fail, but `|| echo ''` swallows the failure **(inference)**.
- **Don't set `NODE_ENV=production` in this stage.** Every dependency is a devDependency **(repo)**. npm's `omit` defaults to `'dev'` when `NODE_ENV=production` [npm-config], which would leave out the build tools.
- **No browser downloads.** `playwright@1.62.1` and `playwright-core@1.62.1` declare no install scripts [npm-pw], and the lockfile marks only `fsevents` with `hasInstallScript` **(repo)**. CI installs browsers in a separate explicit step (`npx playwright install`) **(repo)**. The Playwright docs describe installing browsers only through that command [pw-browsers]. `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` is documented, but only for the Java bindings [pw-browsers].
- **Glibc or musl both work.** The lock includes `-gnu` and `-musl` native bindings for x64 and arm64 **(repo)**, so a `node:*-slim` or a `node:*-alpine` build stage will install.
- **Build-time environment.** Vite loads `.env`, `.env.local`, `.env.[mode]` and `.env.[mode].local` from the env directory. Variables already in the process environment "have the highest priority and will not be overwritten by `.env` files" [vite-env]. An `ENV`/`ARG` in the Node stage would therefore win over any `.env`. `PUBLIC_API_BASE_URL` is imported from `$env/static/public` in `frontend/src/lib/player/api.ts` **(repo)**. Issues 01 and 04 decide its value.

**What crosses between the stages**
- **Node to Python:** only the static build output. With `@sveltejs/adapter-static`, `pages` and `assets` default to `build` [kit-static], so this is `frontend/build/`. The repo still uses `adapter-auto` (`frontend/vite.config.ts`) **(repo)**. Switching adapters is issue 01/03's call. Nothing else is needed: no `node_modules` and no Node runtime.
- **Build context to Python:**
  - `backend/main.py` and `backend/library.py` (copied);
  - `backend/pyproject.toml` and `backend/uv.lock` (bind-mounted for the sync and not needed at runtime when uv isn't used at runtime);
  - optionally `backend/.python-version`.

  `backend/tests/` isn't needed **(repo)**.
- **Builder to runtime, if a separate Python builder stage is used:**
  - `/app/.venv` **plus** the two source modules, because the virtual project's source is not in the venv;
  - the venv at the **same path** on the **same Python image**, because its scripts point at absolute interpreter paths [uv-example multistage].

  uv's own `--no-editable` "copy only the venv" pattern [uv-docker] assumes a packaged project.

**Python stage shapes and their trade-offs** **(inference)**:
- **(a) One Python stage, uv copied in:** simplest, and uv stays in the final image.
- **(b) One Python stage, uv bind-mounted per `RUN`:** uv is not in the image, and there are still only two stages in total.
- **(c) Builder plus runtime:** uv-docker-example's "multistage" shape. uv and its cache stay out, but there's one more stage to keep in sync.

## 4. Running as non-root, and reading a read-only bind mount owned by a host user

**Image side** [dockerfile-ref-user], [docker-bp-user], [dockerfile-ref-chown]
- `USER <user>[:<group>]` or `USER <UID>[:<GID>]` sets the user for later `RUN` instructions and for the runtime `CMD`/`ENTRYPOINT`. If the user has no primary group, the root group is used.
- Docker's best practices: "If a service can run without privileges, use `USER` to change to a non-root user". They also say: "Consider an explicit UID/GID", because otherwise the "next" UID/GID is assigned whenever the image is rebuilt. Use `useradd --no-log-init` for large UIDs.
- uv-docker-example: `groupadd --system --gid 999 nonroot && useradd --system --gid 999 --uid 999 --create-home nonroot`, then `USER nonroot` [uv-example].
- **Who owns the copied files.** Without `--chown`, `COPY` creates files as UID/GID 0. The multistage example copies `/app` with `--chown=nonroot:nonroot`. Root-owned, world-readable app files also work for an app that only reads its code; it then can't write `__pycache__` next to `main.py` **(inference)**.
- **Compose can override the user.** `user` in compose overrides the image's `USER` [compose-user].

**Host-owned bind mount**
- **Making the mount read-only.** Short syntax `HOST:CONTAINER:ro`, or long syntax with `read_only: true` [compose-volumes]. Docker makes submounts read-only too on kernel 5.12 or later [docker-bind].
- **No ID mapping.** Docker's docs describe UID remapping only for userns-remap, which "introduces some configuration complexity … such as bind mounts" [docker-userns]. Without it, the container process's numeric UID/GID is checked against the host files' numeric owner and mode bits, with no translation **(inference from Linux semantics; Docker's bind-mount page doesn't spell this out)**.
- **Ways to make the files readable** **(inference)**:
  - (1) The host files are world-readable: files `o+r`, directories `o+rx`. This is a common default, and any container UID can then read them.
  - (2) Run the container as the host owner's numbers with compose `user: "1000:1000"`.
  - (3) Add the host group with compose `group_add` (it "specifies additional groups, by name or number") [compose-group-add].
  - (4) Build the image with `ARG` UID/GID.
- **Compose interpolation gotcha.** Bash's `$UID` is a shell variable but is **not exported**: `env` shows no `UID` **(checked locally)**. So `user: "${UID}:${GID}"` in compose only works if the values are in the `.env` file or exported first **(inference)**.
- **Permission problems fail quietly.** `library.py` catches errors from `MP3(file_path)` and logs "Skipping unreadable mp3 file" **(repo)**. `Path.rglob` silently skips a directory it can't list (Python 3.12.3) **(checked locally)**. A wrong UID therefore produces a smaller Library and a healthy `/health`, not a crash.
- **A missing host path becomes an empty folder.** With short syntax, "the short syntax creates a directory at the source path on the host if it doesn't exist". Long syntax with `bind: create_host_path: false` prevents that [compose-volumes]. `docker run --mount` errors on a missing source by default [docker-bind]. So a typo in the `.env` path gives an empty music folder under short syntax and an error under long syntax with `create_host_path: false` **(inference)**.

## 5. Running uvicorn in production

**Host, port and app location** [uvi-settings], [uvi-config]
- `--host` defaults to `127.0.0.1`. "Use `--host 0.0.0.0` to make the application available on your local network". `'::'` is supported for IPv6. `--port` defaults to `8000`.
- `--app-dir` defaults to the current working directory, so `WORKDIR` (or `--app-dir`) must be the directory that holds `main.py`.
- Every option can also be set with a `UVICORN_*` environment variable. CLI options take precedence over environment variables.
- `MUSIC_DIR` is read at import and defaults to `./music`, relative to the working directory **(repo)**. That is why the Dockerfile sets `ENV MUSIC_DIR=/music` (a map constraint).

**Command form and signals**
- **Exec form only.** FastAPI: "**always** use the **exec form** … to ensure that FastAPI can shutdown gracefully and lifespan events are triggered" [fastapi-docker]. Docker: a shell-form entrypoint runs under `/bin/sh -c`, "which does not pass signals", so the executable "will not be the container's PID 1" [dockerfile-ref-entrypoint].
- **uvicorn handles SIGTERM and SIGINT itself** (`HANDLED_SIGNALS` in `server.py`, 0.51.0) [uvi-server]. On Linux, PID 1 only receives signals "for which init has explicitly installed signal handlers" [kill2]. uvicorn running as PID 1 therefore still shuts down on `docker stop`.
- **`uv run` as the `CMD`.**
  - uv does not hand the process over to the command. It "will forward most signals (with the exception of SIGKILL, SIGCHLD, SIGIO, and SIGPOLL) to the child" [uv-run].
  - `uv run` locks and syncs before running the command [uv-sync-concepts]. The example image's `uv run` "sync[s] dependencies on startup, respecting UV_NO_DEV" [uv-example]. Without `UV_NO_DEV`, that would install the dev group at container start.
  - The production images in uv-docker-example (multistage and standalone) run the venv's binaries from `PATH` and carry no uv [uv-example].
- **An init process.** `init: true` in compose, or `docker run --init`, runs tini (`docker-init`) as PID 1. It "forwards signals and reaps processes" [compose-init], [docker-run-init]. Reaping matters when a process has children: `--workers` and `--reload` start them, a single-process uvicorn doesn't **(inference)**.
- **Shutdown timing.** Compose waits `stop_grace_period` (default 10s) after the stop signal before SIGKILL [compose-stop]. uvicorn's `--timeout-graceful-shutdown` defaults to `None`, meaning no limit [uvi-config]. An audio stream still in progress at shutdown is cut off by SIGKILL after 10s unless uvicorn's timeout is set lower **(inference)**.

**Workers: the sources differ**
- **uvicorn's Docker page:** the image "uses a single Uvicorn worker". "The recommended approach is to let your orchestration system manage the number of deployed containers" [uvi-docker]. `--workers` defaults to `$WEB_CONCURRENCY`, or 1 [uvi-settings].
- **FastAPI:** in a cluster, run "a single (Uvicorn) process per container". For a **single server with Docker Compose**, "you could want to have a single container with a process manager starting several worker processes". These are "not rules written in stone" [fastapi-docker].
- **Facts specific to this app:**
  - Each worker is a separate process, and processes "don't share any memory" [fastapi-concepts]. Each one runs the lifespan, so it would rescan the music folder and hold its own Library **(repo + inference)**.
  - The endpoints are plain `def`, and these run "in an external threadpool" [fastapi-async]. One process already serves requests concurrently.

**Proxy headers**
- FastAPI says to add `--proxy-headers` only "behind a TLS Termination Proxy (load balancer) like Nginx or Traefik" [fastapi-docker].
- In uvicorn, proxy headers are enabled by default but only trusted from `--forwarded-allow-ips`, which defaults to `$FORWARDED_ALLOW_IPS` or `127.0.0.1` and `::1` [uvi-settings], [uvi-config].
- The map rules out a reverse proxy, and the app doesn't read the client address or the scheme **(repo)**. With Docker port publishing, the peer address uvicorn sees isn't `127.0.0.1`, so forwarded headers wouldn't be trusted anyway **(inference)**.
- uvicorn warns: "Only trust clients you can actually trust!" [uvi-deploy].

Illustrative runtime tail:
```dockerfile
ENV PATH="/app/.venv/bin:$PATH" PYTHONUNBUFFERED=1 MUSIC_DIR=/music
USER nonroot
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```
`PYTHONUNBUFFERED=1` comes from uv-docker-example. Its comment: it keeps the app from crashing "without emitting any logs due to buffering" [uv-example].

## 6. A container health check against `/health` without curl

**Dockerfile `HEALTHCHECK`** [dockerfile-ref-hc]
- **Defaults:** `--interval=30s`, `--timeout=30s`, `--start-period=0s`, `--start-interval=5s` (needs Docker Engine 25.0 or later), `--retries=3`.
- **Exit codes:** 0 means healthy, 1 means unhealthy, and 2 is reserved. A check that runs past the timeout is killed with SIGKILL and counts as a failure.
- **Start period:** "Probe failure during that period will not be counted". The first success ends the start period.
- **Output:** probe output (the first 4096 bytes) is stored and can be read with `docker inspect`.
- **Only one:** only the last `HEALTHCHECK` in a Dockerfile counts.

**Compose `healthcheck`** [compose-hc]
- It works the same way and has the same defaults. Compose can override the image's values, or turn the check off with `disable: true`.
- `test` takes `CMD` (exec), `CMD-SHELL`, or a plain string (shell). Durations are allowed since Compose 2.20.2.

**Why curl isn't an option, and what replaces it**
- The `python:3.12/slim-trixie` Dockerfile installs wget only to build Python, then purges it [py-slim-df]. Neither curl nor wget is left in the image.
- `urllib.request.urlopen` "Raises URLError on protocol errors". The default handler turns HTTP error statuses into `HTTPError` [py-urllib]. An uncaught exception exits with status 1, and `sys.exit(True)` also exits with 1 [py-sys-exit]. Connection refused gave exit code 1 **(checked locally)**.

Illustrative probe:
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=<scan budget> --start-interval=5s --retries=3 \
  CMD ["python", "-c", "import sys, urllib.request; sys.exit(urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4).status != 200)"]
```
- In exec form the port is fixed. If the port becomes configurable, use `CMD-SHELL` so a variable can be substituted [dockerfile-ref-exec].

**Timing facts for this app**
- uvicorn's `startup()` awaits `lifespan.startup()` before it creates any listeners [uvi-server], and the lifespan runs `scan_library` synchronously **(repo)**. While the scan runs, the probe gets "connection refused".
- Without a start period, about `interval × retries` (≈ 90s at the defaults) of scanning makes the container `unhealthy` **(inference)**.
- `/health` returns `{"status":"ok"}` without looking at the Library **(repo)**, so an empty or unmounted music folder still reports healthy.
- `restart` acts on container *termination* (`no`, `always`, `on-failure`, `unless-stopped`) [compose-restart]. Neither reference describes any action on `unhealthy`.

## 7. What `.dockerignore` should exclude for this layout

**How the matching works** [docker-ignore]
- The file is read from the **root of the build context**. Matched paths are removed before the context is sent to the builder.
- Patterns use Go `filepath.Match` with an added `**` wildcard. Leading and trailing slashes are ignored, and `!` re-includes. The last matching line wins.
- Patterns are **anchored at the context root**. Docker's own example shows that `*/temp*` reaches only one level down. So `.venv` excludes `/.venv` but **not** `backend/.venv`, and the same goes for `node_modules`. Use `**/.venv` or `backend/.venv`. Docker's best-practices page says the syntax is "similar to `.gitignore`" [docker-bp-ignore], but the matching above differs from Git's.
- Excluding `Dockerfile` and `.dockerignore` keeps them out of `COPY`, but they are still sent to the builder.
- A Dockerfile-specific `<name>.Dockerfile.dockerignore` takes precedence over the root file.
- The `.dockerignore` file "is not applied to volume mounts during container runs" [uv-example README]. It doesn't affect the runtime music mount.

**What exists or is ignored in this repo** **(repo)**
- `backend/.gitignore` lists `__pycache__/`, `*.py[oc]`, `build/`, `dist/`, `wheels/`, `*.egg-info`, `.venv` and `music`. The last one comes from commit `e663f8e chore: Ignore local music folder`, and it means `backend/music`. There is no root `.gitignore`.
- `frontend/.gitignore` lists `node_modules`, `/.svelte-kit`, `/build`, `.output` and other adapter outputs, `.env` and `.env.*` (keeping `.env.example` and `.env.test`), and `vite.config.*.timestamp-*`.
- On disk right now: `backend/.venv` exists. There is no `node_modules`, `.svelte-kit` or `build` yet. `frontend/.env.example` exists.
- Other root content that isn't needed in the image: `.git`, `.scratch/`, `docs/`, `.github/`, `TODO.md`, `CLAUDE.md`, `CONTEXT.md` and `shell.nix`. In `frontend/`, the same applies to `.vscode/`, `.mcp.json`, `AGENTS.md` and `CLAUDE.md`. `backend/tests/` is also unnecessary.

**What each exclusion is for** **(inference, from the facts above)**
- `**/.venv`: uv says to exclude it because "the project virtual environment is dependent on your local platform" [uv-docker].
- `**/node_modules`, `frontend/.svelte-kit`, `frontend/build`: rebuilt inside the image. `npm ci` would delete a copied `node_modules` anyway [npm-ci].
- `backend/music` (and a root `music/` if the compose `.env` ever points there): this is potentially gigabytes in the build context.
- `**/.env` and `**/.env.*`:
  - the compose `.env` beside the compose file holds host paths;
  - a dev `frontend/.env` would be loaded by Vite and inlined [vite-env];
  - `.env.example` isn't loaded by Vite and isn't needed either.
- `**/__pycache__` and `**/*.py[oc]`: these depend on the platform and Python version.
- `.git`, `.scratch`, `docs`, `.github`: never copied, and excluding them keeps the context small.

**Denylist or allowlist**
- An allowlist is also possible: `*`, then `!backend/main.py`, `!backend/library.py`, `!backend/pyproject.toml`, `!backend/uv.lock`, `!frontend/`, followed by re-excludes for `frontend/node_modules` and the other generated folders.
- An allowlist ignores new local clutter automatically, but it has to be updated when a backend module is added **(inference)**.

## 8. Building the image in GitHub Actions without pushing, with layer caching

**Actions and inputs** [docker-gha], [bpa], [sbx]
- `docker/setup-buildx-action@v4` "creates and boots a BuildKit builder". The default `driver` is `docker-container`.
- `docker/build-push-action@v7`: `push` defaults to `false`, and so does `load`.
- With the docker-container driver and no output, "the build result remains in the build cache". Use `load: true` to get an image you can `docker run` [docker-drivers]. Docker's "test before push" example uses `load: true` and then `docker run` [docker-gha-test]. That is one way to smoke-test `/health` in CI **(inference)**.
- **Git context is the default.** BuildKit fetches `https://github.com/<owner>/<repo>.git#<ref>` itself, "so you don't need to use the `actions/checkout` action". Files changed by earlier steps are ignored: "any file mutation in the steps that precede the build step will be ignored, including processing of the `.dockerignore` file". A path context (`context: .`) needs `actions/checkout`.
- Docker's getting-started workflow sets `permissions: contents: read` and uses `push: ${{ github.event_name != 'pull_request' }}` [docker-gha]. For this repo, push stays false everywhere (a map constraint).
- Docker also offers "Docker GitHub Builder" reusable workflows as an alternative to wiring the actions yourself [docker-gha].

**Layer cache** [docker-gha-backend], [docker-cache-backends], [docker-gha-cache]
- `cache-from: type=gha` and `cache-to: type=gha,mode=max`. The GHA backend is "the recommended cache to use inside your GitHub Actions workflows" within GitHub's size limits. With build-push-action, `url` and `token` are filled in automatically.
- The GHA backend works with the plain `docker` driver only when the containerd image store is enabled. The setup-buildx builder (docker-container) is fine.
- `mode=min` (the default) caches "only layers that are exported into the resulting image". `mode=max` caches "all layers … even those of intermediate steps". The Node stage and the Python dependency layer are intermediate, so `min` would not cache `npm ci` **(inference from the quote)**.
- `scope` defaults to `buildkit`. Multiple images in one repo overwrite each other's cache unless each sets its own scope. This repo has a single image.
- Only GitHub cache API v2 is supported since 2025-04-15. Hosted runners already have new enough Buildx and BuildKit.
- **Write access:** "Regular `pull_request` runs using a merge ref retain read-write cache access". `pull_request_target`, `issue_comment` and `pull_request: types: [closed]` get read-only access. For those, keep `cache-from` and drop `cache-to`, or add `ignore-error=true`.
- **Cache mounts** (uv and npm caches) are not stored in the GHA cache. The documented workaround is `reproducible-containers/buildkit-cache-dance` with `actions/cache`. Without it, a changed `uv.lock` or `package-lock.json` re-downloads from PyPI or npm on CI **(inference)**.

Illustrative job (to add to `test.yml` or a new workflow; the triggers are already `push: [master]` and `pull_request`):
```yaml
  image:
    name: Docker image build
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: docker/setup-buildx-action@v4
      - uses: docker/build-push-action@v7
        with:
          push: false
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

**Repo observation.** The existing jobs pin `actions/checkout@v4`, `astral-sh/setup-uv@v4` and `actions/setup-node@v4` **(repo)**. The current majors are checkout v7 (Docker's docs still show v6), setup-uv v10 and setup-node v7.

## Open points

- **Lock-only sync on uv 0.13.x.** Does the guide's lock-only `uv sync --frozen --no-install-project` work there? It failed on uv 0.11.21. Mounting `pyproject.toml` as well, as uv-docker-example and uvicorn do, avoids the question.
- **Lock revision.** Does `uv sync --locked` on the image's uv (0.13.x) accept the `uv.lock` written by the nix shell's uv 0.11.21 (`revision = 2`)? Or should the uv tag in the image be pinned to match the dev uv? Neither was tested.
- **Which uv shape.** Should uv be in the final image (simpler, allows `uv run` debugging) or out of it (bind-mount, or a builder stage)? Pin by tag or by digest?
- **Which bases.** For Python, `python:3.12-slim-trixie` or a uv-derived image; full and alpine are also possible. For Node: 22 (matches CI, EOL 2027-04-30), 24, or 26 (the current `lts`), and slim or alpine.
- **Image UID/GID.** Is the image user's UID/GID fixed (999 as in uv's example, or 1000), overridden at run time with compose `user:`, or set by build arg? This depends on the target host's music-folder permissions, which aren't known yet.
- **Scan budget.** How long is the scan budget for `start_period`? A health check that also reports Library size would detect an empty or unmounted music folder, but that changes `/health` behaviour (issue 06).
- **Mount syntax.** Short syntax `:ro` (creates a missing host path) or long syntax with `read_only: true` and `create_host_path: false` (errors instead)?
- **Smoke test in CI.** Should CI only build, or also `load` the image and probe `/health`?
- **Cross-issue dependencies.** Where the static build lands in the image, and how `/` is served, depends on issues 01, 03 and 04. `main.py` currently defines `GET /`, which returns a JSON hello **(repo)**.

## Sources

[uv-docker]: https://docs.astral.sh/uv/guides/integration/docker/
[uv-release]: https://github.com/astral-sh/uv/releases/tag/0.13.7
[uv-build-docker-wf]: https://github.com/astral-sh/uv/blob/main/.github/workflows/build-docker.yml
[uv-sync-cli]: https://docs.astral.sh/uv/reference/cli/#uv-sync
[uv-env]: https://docs.astral.sh/uv/reference/environment/
[uv-settings-groups]: https://docs.astral.sh/uv/reference/settings/#default-groups
[uv-build]: https://docs.astral.sh/uv/concepts/projects/config/#build-systems
[uv-sync-concepts]: https://docs.astral.sh/uv/concepts/projects/sync/
[uv-run]: https://docs.astral.sh/uv/concepts/projects/run/#signal-handling
[uv-pyver]: https://docs.astral.sh/uv/concepts/python-versions/#python-version-files
[uv-example]: https://github.com/astral-sh/uv-docker-example
[fastapi-docker]: https://fastapi.tiangolo.com/deployment/docker/
[fastapi-concepts]: https://fastapi.tiangolo.com/deployment/concepts/
[fastapi-async]: https://fastapi.tiangolo.com/async/#path-operation-functions
[uvi-settings]: https://www.uvicorn.org/settings/
[uvi-deploy]: https://www.uvicorn.org/deployment/
[uvi-docker]: https://www.uvicorn.org/deployment/docker/
[uvi-server]: https://github.com/Kludex/uvicorn/blob/0.51.0/uvicorn/server.py
[uvi-config]: https://github.com/Kludex/uvicorn/blob/0.51.0/uvicorn/config.py
[dockerfile-ref]: https://docs.docker.com/reference/dockerfile/#syntax
[dockerfile-ref-exec]: https://docs.docker.com/reference/dockerfile/#shell-and-exec-form
[dockerfile-ref-entrypoint]: https://docs.docker.com/reference/dockerfile/#entrypoint
[dockerfile-ref-cache]: https://docs.docker.com/reference/dockerfile/#run---mounttypecache
[dockerfile-ref-hc]: https://docs.docker.com/reference/dockerfile/#healthcheck
[dockerfile-ref-user]: https://docs.docker.com/reference/dockerfile/#user
[dockerfile-ref-chown]: https://docs.docker.com/reference/dockerfile/#copy---chown
[docker-multistage]: https://docs.docker.com/build/building/multi-stage/
[docker-buildkit]: https://docs.docker.com/build/buildkit/
[docker-ignore]: https://docs.docker.com/build/concepts/context/#dockerignore-files
[docker-bp-user]: https://docs.docker.com/build/building/best-practices/#user
[docker-bp-ignore]: https://docs.docker.com/build/building/best-practices/#exclude-with-dockerignore
[docker-cache-opt]: https://docs.docker.com/build/cache/optimize/
[docker-cache-backends]: https://docs.docker.com/build/cache/backends/#cache-mode
[docker-gha-backend]: https://docs.docker.com/build/cache/backends/gha/
[docker-gha-cache]: https://docs.docker.com/build/ci/github-actions/cache/
[docker-gha]: https://docs.docker.com/build/ci/github-actions/
[docker-gha-test]: https://docs.docker.com/build/ci/github-actions/test-before-push/
[docker-drivers]: https://docs.docker.com/build/builders/drivers/
[docker-bind]: https://docs.docker.com/engine/storage/bind-mounts/
[docker-userns]: https://docs.docker.com/engine/security/userns-remap/
[docker-run-init]: https://docs.docker.com/reference/cli/docker/container/run/#init
[compose-hc]: https://docs.docker.com/reference/compose-file/services/#healthcheck
[compose-volumes]: https://docs.docker.com/reference/compose-file/services/#volumes
[compose-user]: https://docs.docker.com/reference/compose-file/services/#user
[compose-group-add]: https://docs.docker.com/reference/compose-file/services/#group_add
[compose-init]: https://docs.docker.com/reference/compose-file/services/#init
[compose-stop]: https://docs.docker.com/reference/compose-file/services/#stop_grace_period
[compose-restart]: https://docs.docker.com/reference/compose-file/services/#restart
[bpa]: https://github.com/docker/build-push-action
[sbx]: https://github.com/docker/setup-buildx-action
[py-hub]: https://hub.docker.com/_/python
[py-tags]: https://github.com/docker-library/official-images/blob/master/library/python
[py-slim-df]: https://github.com/docker-library/python/blob/master/3.12/slim-trixie/Dockerfile
[py-cycle]: https://devguide.python.org/versions/
[node-hub]: https://hub.docker.com/_/node
[node-sched]: https://github.com/nodejs/Release/blob/main/schedule.json
[py-urllib]: https://docs.python.org/3/library/urllib.request.html#urllib.request.urlopen
[py-sys-exit]: https://docs.python.org/3/library/sys.html#sys.exit
[kill2]: https://man7.org/linux/man-pages/man2/kill.2.html
[npm-config]: https://docs.npmjs.com/cli/v11/using-npm/config#omit
[npm-ci]: https://docs.npmjs.com/cli/v11/commands/npm-ci
[npm-scripts]: https://docs.npmjs.com/cli/v11/using-npm/scripts#npm-ci
[npm-pw]: https://registry.npmjs.org/playwright/1.62.1
[pw-browsers]: https://playwright.dev/docs/browsers
[vite-env]: https://vite.dev/guide/env-and-mode#env-files
[kit-static]: https://svelte.dev/docs/kit/adapter-static

- uv: [Using uv in Docker][uv-docker] · [`uv sync` CLI reference][uv-sync-cli] · [environment variables][uv-env] · [settings: default-groups][uv-settings-groups] · [build systems][uv-build] · [locking and syncing][uv-sync-concepts] · [`uv run` signal handling][uv-run] · [Python version files][uv-pyver] · [release 0.13.7][uv-release] · [derived image Dockerfile in build-docker.yml][uv-build-docker-wf] · [uv-docker-example][uv-example] (`Dockerfile`, `multistage.Dockerfile`, `standalone.Dockerfile`, `.dockerignore`, `compose.yml`, `README.md`)
- FastAPI: [FastAPI in Containers – Docker][fastapi-docker] · [Deployment concepts][fastapi-concepts] · [async / path operation functions][fastapi-async]
- uvicorn: [Settings][uvi-settings] · [Deployment][uvi-deploy] · [Dockerfile][uvi-docker] · [`server.py` @0.51.0][uvi-server] · [`config.py` @0.51.0][uvi-config]
- Docker: [Dockerfile reference][dockerfile-ref] · [multi-stage builds][docker-multistage] · [BuildKit][docker-buildkit] · [build context / .dockerignore][docker-ignore] · [best practices][docker-bp-user] · [optimize cache][docker-cache-opt] · [cache backends][docker-cache-backends] · [GHA cache backend][docker-gha-backend] · [GHA cache management][docker-gha-cache] · [GitHub Actions][docker-gha] · [test before push][docker-gha-test] · [build drivers][docker-drivers] · [bind mounts][docker-bind] · [userns-remap][docker-userns] · [`docker run --init`][docker-run-init] · [Compose services reference][compose-hc] · [build-push-action][bpa] · [setup-buildx-action][sbx]
- Images: [python on Docker Hub][py-hub] · [python tags][py-tags] · [python 3.12 slim-trixie Dockerfile][py-slim-df] · [node on Docker Hub][node-hub] · [Node release schedule][node-sched] · [Python versions][py-cycle]
- Other: [urllib.request][py-urllib] · [sys.exit][py-sys-exit] · [kill(2)][kill2] · [npm config][npm-config] · [npm ci][npm-ci] · [npm scripts][npm-scripts] · [playwright 1.62.1 registry metadata][npm-pw] · [Playwright browsers][pw-browsers] · [Vite env files][vite-env] · [adapter-static][kit-static]

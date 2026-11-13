# Research: serving a static SvelteKit build from FastAPI

Answers [issue 01](../issues/01-serving-static-sveltekit-from-fastapi.md). Researched 2026-11-11.

**Versions checked** (from `frontend/package-lock.json` and `backend/uv.lock`): `@sveltejs/kit` 2.70.2 (range `^2.63.0`), `vite` 8.2.1, `svelte` 5.56.9, `@sveltejs/adapter-static` 3.0.11 (the latest release for Kit 2), FastAPI 0.139.2, Starlette 1.3.1, uvicorn 0.51.0.

**Method.** I read the docs and the source at those exact tags. Then I ran builds and tests on a throwaway copy of `frontend/` in the session scratchpad (the repo was not touched):
- `vite build` with adapter-static in six setups, labelled A–E and G below
- `TestClient` probes of FastAPI against each build's output
- a live `vite dev` with `server.proxy` pointed at a stub uvicorn backend

Where a claim was tested this way, it is marked *(verified)*.

> **Version note.** SvelteKit 3 is out (3.0.0 on 2026-10-01, latest 3.2.0), and **svelte.dev/docs/kit now documents v3**. The Kit 2 docs are cited from the `version-2` branch of `sveltejs/kit`, pinned at commit `70a5ad2`.

## Summary

**(a) Adapter, prerender and SSR**

- **Install `@sveltejs/adapter-static@^3`, not plain `@sveltejs/adapter-static`.** The plain command, which the Kit 2 docs still show, now installs 4.0.1. That version needs `@sveltejs/kit@^3` and fails with `ERESOLVE` against this repo *(verified)*.
- **Where the options go.** Adapter options go at the top level of `sveltekit({ adapter: adapter({...}) })` in `vite.config.ts`. This is supported since Kit 2.62.0. Page options (`prerender`, `ssr`) can't be set in config: they need a new `src/routes/+layout.ts` (or `+page.ts`).
- **adapter-static refuses to build until you choose a mode.** With neither prerendering nor a `fallback`, it fails with "Encountered dynamic routes" *(verified)*.
- **Prerender with SSR on** (`prerender = true`): writes `build/index.html`, about 14 KB. It contains the server-rendered app shell (header, nav, empty views, favicon `<link>`), and the library is not fetched at build time. Asset URLs are relative (`./_app/...`) *(verified)*.
- **SPA** (`ssr = false` plus `fallback`): writes only `build/<fallback>`, a 1.1 KB empty shell with absolute `/_app/...` URLs. There is **no `index.html`** unless the fallback itself is named that *(verified)*.
- Because the app has one URL (`/`), either mode gives a working app. The differences are:
  - whether the shell renders before JS runs
  - whether module-level code must be SSR-safe
  - what unknown paths return
- **The current `adapter-auto` produces no deployable output** off a supported platform. It only logs "Could not detect a supported production environment".

**(b) URL layout, and how the frontend finds the API**

- **`$env/static/public` is fixed at build time.**
  - The value is inlined into the client JS *(verified)*.
  - The variable **must be defined**, or `vite build` fails with `MISSING_EXPORT` *(verified)*.
  - **An empty string is fine.** `PUBLIC_API_BASE_URL=` gives root-relative `fetch('/tracks')` and `/stream/<id>`, so requests go to the page's own origin *(verified)*.
  - A real environment variable beats `.env` files, so `PUBLIC_API_BASE_URL= npm run build` overrides a developer's local `.env`.
- **Vite `server.proxy` works with SvelteKit dev.** With it, dev can use the same empty or relative base: `/tracks` and `Range` requests on `/stream` pass through to uvicorn *(verified)*. It also means a phone on the LAN only needs to reach Vite.
- **FastAPI 0.138+ has `app.frontend("/", directory=...)` for exactly this case.**
  - Normal routes are always tried first, whatever the registration order.
  - Its fallback options are `"auto"`, `"index.html"`, `"404.html"` or `None`, and the `index.html` fallback is served only to HTML navigations.
- **The older approach, `app.mount("/", StaticFiles(html=True))`, also works but has catches:**
  - It must be registered after the API routes, or it shadows them *(verified)*.
  - It catches everything unmatched, so `/tracks/` returns 404 instead of redirecting.
  - Its only fallback is `404.html`, served with status 404.
- **The existing `GET /` "Hello, World" route wins over both approaches**, so the frontend can't be served at `/` while that route exists *(verified)*.
- **Neither approach sets `Cache-Control`** *(verified)*. SvelteKit's own adapters send `public,max-age=31536000,immutable` for `/_app/immutable/*`. That header has to be added by hand, through a middleware or a `StaticFiles` subclass *(verified)*. HTML should get `no-cache`.

---

## 1. adapter-static: prerender vs SPA fallback, required settings, build output

**Which version to install**
- adapter-static 4.x declares `peerDependencies: { "@sveltejs/kit": "^3.0.0-next.0" }`, while 3.0.11 (released 2026-11-05) declares `^2.0.0`. Running `npm i -D @sveltejs/adapter-static` against this repo fails with `ERESOLVE … peer @sveltejs/kit@"^3.0.0-next.0" from @sveltejs/adapter-static@4.0.1` *(verified)*. Source: npm registry metadata.
- The Kit 2 docs still give the unpinned command ([v2 adapter-static doc][v2-static]).

**Where the configuration goes**
- "Since version 2.62.0 you can also pass your configuration to the `sveltekit` plugin in your Vite config" ([v2 configuration][v2-config]; changelog 2.62.0, "support passing Svelte(Kit) config via Vite plugin" #15944, [CHANGELOG][v2-changelog]).
- The `kit.*` options become **top-level plugin options**: `split_config` plucks out every key of `defaults.kit` and forwards the rest to vite-plugin-svelte ([`core/config/index.js#L22`][kit-config-src]). So the call is `sveltekit({ adapter: adapter({ fallback: '200.html' }), compilerOptions: … })`, with no `kit:` wrapper.
- In Kit 3, `svelte.config.js` is no longer supported at all ([v3 migration guide][v3-migrate]).
- The adapter docs show options inside `kit:` in `svelte.config.js`, because the v2 docs predate this style ([v2-static]).

**Page options**
- `prerender` and `ssr` are exported from `+page.(js|ts)` or `+layout.(js|ts)`. The root layout sets them for the whole app ([v2 page options][v2-pageopts]).
- Kit config has no app-wide default for them: `kit.prerender` only takes `entries`, `crawl`, `concurrency`, `handle*` ([`core/config/options.js`][kit-options-src]).
- This repo has no `+layout.ts` today, so one would have to be created.

**Strict check.** Unless `fallback` is set (or hash routing is used), adapter-static fails the build when any route isn't prerendered. `strict: false` turns the check off ([adapter-static `index.js#L9-L41`][as-index]). Error confirmed against this repo: `all routes must be fully prerenderable … - src/routes/` *(verified)*.

**What each setup produces** *(all verified, built with `PUBLIC_API_BASE_URL=`)*

| | Root `+layout.ts` | adapter options | Files besides `_app/` | `index.html` |
|---|---|---|---|---|
| A. Prerender, SSR on | `prerender = true` | none | `index.html`, `robots.txt` | 14 KB. Full shell markup, `<link rel=icon>` inlined as a data URI, relative `./_app/…` URLs, hydration data `node_ids: [0, 2]` |
| D. Prerender, SSR off | `prerender = true; ssr = false` | none | `index.html`, `robots.txt` | 1.1 KB empty shell. Relative URLs; module preloads include the page node |
| B. SPA | `ssr = false` | `fallback: '200.html'` | `200.html`, `robots.txt` | **none**. `200.html` is 1.1 KB, with absolute `/_app/…` URLs and `base: ""` |
| C. Prerender plus fallback | `prerender = true` | `fallback: '200.html'` | `index.html` (as in A) and `200.html` | as in A |
| G. Prerender, fallback named `index.html` | `prerender = true` | `fallback: 'index.html'` | `index.html` | the shell **overwrites** the prerendered page. Kit warns: "Overwriting build/index.html with fallback page. Consider using a different name for the fallback." ([`builder.js#L199`][kit-builder]) |

- Every build also contains:
  - `_app/version.json`
  - `_app/immutable/{entry,chunks,nodes,assets}/*`: hashed JS and CSS, plus the five Manrope `.woff2` files
- The favicon from `src/lib/assets` is small enough that Vite inlines it, so no separate file is written. The whole of A is 308 KB.
- What the docs say about each mode:
  - **Prerendering:** "You must ensure SvelteKit's `ssr` option isn't set to `false`. Otherwise, prerendering will save an empty 'shell' page instead of the fully rendered content" ([v2-static]). D is that empty shell: it is allowed, and it is what you get.
  - **SPA:** set `export const ssr = false` in the root layout, then add adapter-static with `fallback`. The fallback "will always contain absolute asset paths … regardless of the value of `paths.relative`". The docs also say "We recommend avoiding `index.html` if possible as it may conflict with prerendering" ([v2 SPA doc][v2-spa]). G shows that conflict.
  - **Fallback name:** `200.html` is "commonly" used, "but can vary depending on your deployment platform". It has to match whatever name the server looks for (§5).
  - **SPA performance:** the SPA doc warns about the cost of SPA mode, "Unless you are serving the app from a local network" ([v2-spa]).
  - **Prerendered asset paths:** relative by default, because `paths.relative` defaults to `true` ([`public.d.ts`][kit-public-dts]).
  - **`trailingSlash`:** doesn't matter here. `/` is always written as `index.html` ([v2-pageopts], "Route conflicts").
- **Unknown paths with a prerendered build.** Suppose the server returns the prerendered `index.html` for a path like `/nope` (FastAPI's `fallback="auto"` does, §5). The client's `_hydrate` then resolves `route = { id: null }` for that URL. It still hydrates the server-provided `node_ids`, so the root page renders at `/nope` ([`client.js#L2995-L3013`][kit-client]; source reading only, not tested in a browser).

## 2. What a build-time prerender does with browser-only code

- **During the build, SvelteKit runs the app's code in Node, where `browser` is `false`.**
  - "SvelteKit analyses your app during the `build` step by running it. During this process, `building` is `true`. This also applies during prerendering." `browser` is "`true` if the app is running in the browser" ([`runtime/app/env/types.d.ts`][kit-env-types]).
  - `browser` comes from `esm-env`. Its `./browser` export resolves to `true.js` only under the `browser` export condition, so it is a constant `false` in the SSR/prerender bundle (`esm-env@1.2.2` `package.json` `exports`).
- **This app's store:**
  - `export const player = new PlayerStore()` runs at module load in Node.
  - With `browser === false`: no `Audio` is created, no `window`/`document` listeners are added, `loadLibrary()` is never called, and `browserStorage()` returns `null` (`frontend/src/lib/player/store.svelte.ts`).
  - `$effect`s "only run in the browser, not during server-side rendering" ([Svelte `$effect`][svelte-effect]).
  - `connectMediaSession` returns early on Node. Node 24 does define a global `navigator`, but `'mediaSession' in navigator` is `false` *(verified with `node -e`)*.
- **What gets prerendered.**
  - The page renders with the store's initial state: `screen: 'home'`, no playlists, no tracks. The output contains the shell (e.g. "MUSIQUE", nav buttons) but no "All Tracks" *(verified, build A)*.
  - The browser hydrates that HTML. The store's constructor then fetches the library and restores saved state.
  - This fits the prerendering rule ("any two users hitting it directly must get the same content") and the glossary note that prerendered pages "are not limited to static content … if user-specific data is fetched and rendered client-side" ([v2 glossary][v2-glossary]; [v2-pageopts]).
- **The constraint this adds.** With prerender plus SSR on (A or C), any future module-level or render-time access to `window`, `document`, `localStorage` etc. outside a `browser` guard becomes a **build failure**, not just a dev SSR error. With `ssr = false` (B or D), components are never rendered in Node.

## 3. `$env/static/public` at build time

- **The value is inlined.**
  - The docs say static variables are "loaded by Vite from `.env` files and `process.env` at build time and then statically injected into your bundle". They stay the same "even if different values … are set at runtime" ([`$env+static+public.md`][kit-env-static-doc]).
  - The module Kit generates is literally `export const KEY = <JSON string>;`, one line per defined key ([`core/env.js#L119`][kit-env-src]).
  - Seen in the built client chunk: `var I=\`http://example.test:8000\`` for an absolute value, and `I=\`\`` for an empty one *(verified)*.
- **The variable must be defined.**
  - If `PUBLIC_API_BASE_URL` is unset, the generated module has no such export. `vite build` then fails: `[MISSING_EXPORT] "PUBLIC_API_BASE_URL" is not exported by "\0virtual:env/static/public"` (Rolldown, Vite 8) *(verified)*.
  - `svelte-kit sync` also leaves it out of `.svelte-kit/ambient.d.ts`, so `npm run check` would report a type error. *(verified that the declaration disappears)*
  - The Vitest suite (`--project server`) still passes with it unset *(verified)*. So tests won't catch a missing value; only build and check will.
- **An empty string is allowed.**
  - `filter_env` keeps any key that has the prefix, whatever its value ([`utils/env.js`][kit-utils-env]), and the build succeeds *(verified)*.
  - The code builds `${API_BASE}/tracks`, so `""` gives `/tracks` and `/stream/<id>`: root-relative URLs on the page's own origin.
  - A path value such as `/api` would work the same way (string concatenation).
- **Where the value comes from.**
  - Vite loads `.env`, `.env.local`, `.env.[mode]` and `.env.[mode].local`. `vite build` runs in `production` mode.
  - "environment variables that already exist when Vite is executed have the highest priority and will not be overwritten by `.env` files" ([Vite env and mode][vite-env]; [`env.ts#L98`][vite-env-src]).
  - So `PUBLIC_API_BASE_URL= npm run build`, or a Dockerfile `ENV`, overrides any `.env` that ends up in the build context.
  - This repo's `.gitignore` ignores `.env` and `.env.*` except `.env.example` and `.env.test`. A committed `.env.production` would need its own exception.
- **Alternatives, for completeness:**
  - **`$env/dynamic/public`** tolerates an unset variable (`env.X ?? ''`). But with adapter-static the values are written at build time to `_app/env.js` (`builder.generateEnvModule()`, [`builder.js#L207`][kit-builder]), so they are still not runtime-configurable.
  - **Explicit environment variables** (`experimental.explicitEnvironmentVariables`, added in 2.63) declare variables in `src/env.ts`, with optional `static: true` and validation ([v2 env doc][v2-env]).
  - **Kit 3 changes.** Kit 3 renames `$app/environment` to `$app/env` and deprecates `$env/*` ([v3-migrate]). The v2 doc says those modules "will be removed", but the v3 guide says "deprecated". This repo imports both `$env/static/public` and `$app/environment`.

## 4. Vite dev-server proxy instead of an absolute API base URL

- **How `server.proxy` matches.**
  - "Any requests whose request path starts with that key will be proxied to the specified target. If the key starts with `^`, it will be interpreted as a `RegExp`." Options include `target`, `changeOrigin` and `rewrite`, and in Vite 8 it is built on `http-proxy-3` ([Vite server options][vite-server], `server.proxy`).
  - The match is a plain prefix test: `url.startsWith(context)` ([`proxy.ts#L231`][vite-proxy-src]). `/tracksXYZ` was forwarded to the backend under a `/tracks` key *(verified)*.
- **The SvelteKit docs recommend this setup.** "set up a proxy to bypass CORS headaches. In production, you would rewrite a path like `/api` to the API server; for local development, use Vite's `server.proxy` option" ([v2 FAQ][v2-faq]).
- **Middleware order with SvelteKit.**
  - Vite adds the proxy middleware before plugins' post-`configureServer` hooks ([`server/index.ts#L960-L1037`][vite-server-src]). SvelteKit's SSR handler is such a post hook, so proxied paths never reach SvelteKit.
  - SvelteKit's own `static/` file server is a pre-hook ([`exports/vite/dev/index.js#L420-L446`][kit-dev-src]), so a file in `static/` with the same path would win. Only `robots.txt` lives there today.
- **Tested live** (Vite on 15173, stub uvicorn on 18000, keys `/tracks` and `/stream`):
  - `GET /` was rendered by SvelteKit.
  - `GET /tracks` returned the backend's JSON.
  - `GET /stream/t1` with `Range: bytes=0-99` returned `206 Partial Content` with `content-range: bytes 0-99/200000` *(verified)*.
- **How many proxy keys are needed.**
  - With the API at the root, each top-level API path needs its own key: `/tracks`, `/playlists` (which also covers `/playlists/{id}/tracks`), `/stream`, and `/health`, `/docs`, `/openapi.json` if wanted. Alternatively, one `^…` regex can cover them all.
  - With an `/api` prefix, a single key does it.
  - Prefix matching means a key also swallows any frontend path that starts with the same string.
- **`vite preview`:** `preview.proxy` defaults to `server.proxy` ([Vite preview options][vite-preview]).
- **LAN testing from a phone.**
  - With the proxy and a relative base, `npm run dev -- --host` is enough. The phone only talks to Vite, which forwards to uvicorn on 127.0.0.1, so there is no `.env` edit to a LAN IP and no LAN-bound uvicorn. (The current README does both.)
  - Vite allows "`localhost` … and all IP addresses" by default. A hostname (e.g. a DNS name for the machine) must be added to `server.allowedHosts` ([vite-server], `server.allowedHosts`).
- **Without a proxy**, dev keeps the absolute `PUBLIC_API_BASE_URL=http://localhost:8000` and needs the existing open CORS.

## 5. Starlette/FastAPI: `StaticFiles`, mounting at `/`, SPA fallback, caching

### `StaticFiles(html=True)` (Starlette 1.3.1)

From [`staticfiles.py#L109-L155`][st-static-src] and the [Starlette docs][st-docs]:
- **Methods:** anything other than `GET`/`HEAD` gets 405.
- **Files:** a regular file is served.
- **Directories** (in `html` mode): `<dir>/index.html` is served, after a redirect that adds a trailing `/` if missing.
- **Misses:** otherwise, in `html` mode, `404.html` is served **with status 404** if it exists ("In HTML mode if `404.html` file exists it will be shown as 404 response"). Failing that, it raises `HTTPException(404)`, which FastAPI renders as `{"detail":"Not Found"}` *(verified)*.
- **There is no option to serve `index.html` with 200 for unknown paths.**

Headers:
- Responses carry `ETag` (an md5 of mtime and size), `Last-Modified` and `Accept-Ranges` ([`responses.py#L330-L338`][st-responses-src]). `If-None-Match` gets a 304 *(verified)*.
- **No `Cache-Control` is ever set.**
- Precompressed `.br`/`.gz` siblings are not served. So adapter-static's `precompress: true` would only add files.

### Mounting at `/` next to API routes

- **The router stops at the first full match, so registration order decides.**
  - Starlette's `Router.app` walks routes in order and dispatches the first `Match.FULL` ([`routing.py#L662-L710`][st-routing-src]).
  - `Mount("/")` compiles to `/{path:path}`, which fully matches every path ([`routing.py#L387-L418`][st-routing-src]).
  - So a mount at `/` only sees requests that no earlier route fully matched. **It must be added after the API routes.**
  - With the mount added first, `GET /tracks` returned 404 from `StaticFiles` *(verified)*.
  - `/docs` and `/openapi.json` survive either order, because FastAPI registers them in `__init__` (`setup()`).
- **Quirks of `Mount("/")`** *(all verified, with the mount added last)*:
  - `GET /tracks/` returns 404. The mount swallows it, so FastAPI's trailing-slash redirect (`redirect_slashes`) never runs.
  - `POST /tracks` returns 405 from the API route, but `POST /nope` also returns 405, from `StaticFiles`.
  - While `@app.get("/")` exists, `GET /` returns the Hello-World JSON, but **`HEAD /` returns the frontend's HTML**. The GET route only partially matches HEAD, so the mount's full match wins.

### `app.frontend()` (FastAPI ≥ 0.138.0)

- **Added** in 0.138.0 (#15800). 0.138.2 made non-GET/HEAD misses return 404, 0.139.0 added dependencies, and 0.139.1 fixed fallback for dotted paths ([release notes][fa-release]).
- **What the docs say** ([FastAPI Frontend docs][fa-frontend]):
  - "FastAPI checks *path operations* first. The frontend files are checked only if no normal route matched."
  - `fallback="index.html"` is used "only for `GET` and `HEAD` requests that explicitly accept HTML … Missing files like JavaScript, CSS, and images still return `404`."
  - `"404.html"` "keeps a status code of `404`".
  - `"auto"` (the default) picks `404.html` if present, otherwise `index.html`. `None` disables fallback.
  - HTTP middleware and dependencies apply to frontend responses.
  - It is for "Static Build Output Only".
  - The static-files tutorial now says: "If you need to host a frontend, use `app.frontend()` instead" ([FastAPI static files][fa-static]).
- **How it works in the source:**
  - Frontend routes go into `_low_priority_routes` ([`routing.py#L2587-L2667`][fa-routing-src]).
  - `APIRouter.app` tries, in order: all normal routes (full match, then partial, e.g. 405), the trailing-slash redirect, and only then the frontend group ([`routing.py#L2670-L2732`][fa-routing-src]).
  - `_FrontendStaticFiles` subclasses `StaticFiles(html=True)`. The fallback check is an `Accept` header containing `text/html` or `application/xhtml+xml` with q≠0 ([`routing.py#L1867-L2007`][fa-routing-src]).
  - Only `index.html` and `404.html` are recognised as fallback names.

**Probe results** *(verified with `TestClient`; the Hello-World route removed unless noted)*

| Request | `Mount("/")`, build A | `frontend` auto, build A | `frontend` `fallback=None`, build A | `frontend` auto, build B (`200.html` only) |
|---|---|---|---|---|
| `GET /` (HTML) | 200 `index.html` | 200 `index.html` | 200 `index.html` | **404** |
| `GET /tracks` | 200 API | 200 API | 200 API | 200 API |
| `GET /tracks/` | 404 | 307 → `/tracks` | 307 → `/tracks` | 307 |
| `POST /nope` | 405 | 404 | 404 | 404 |
| `GET /nope`, `Accept: text/html` | 404 JSON | **200 `index.html`** | 404 JSON | 404 JSON |
| `GET /nope`, `Accept: */*` | 404 JSON | 404 JSON | 404 JSON | 404 JSON |
| `GET /_app/immutable/…js` | 200, no `Cache-Control` | same | same | same |
| `GET /` with Hello-World route kept | JSON (route wins) | — | — | — |

### SPA fallback options

| Server setup | Fallback named `index.html` (build E) | Fallback named `404.html` (build F) | Fallback named `200.html` (build B) |
|---|---|---|---|
| `Mount("/")`, `StaticFiles(html=True)` | `/` 200; unknown paths 404 JSON | **`/` and unknown paths answered with the shell at status 404** | `/` 404 |
| `app.frontend`, auto | `/` 200; unknown HTML navigations 200 | everything **404 with the shell** | `/` 404 |

*(Builds E and F are B with the fallback file renamed. Verified.)*

- For an SPA served by FastAPI, the adapter fallback has to be `index.html`, and `app.frontend` is the server option that serves it to unknown navigations.
- For a prerendered build (A or D), no fallback is needed for the app to work. Unknown paths can be 404 (`fallback=None`, or `Mount`) or the root page (`frontend` auto; see §1 for how the client hydrates it).

### Cache headers for `_app/immutable`

- **What SvelteKit expects.** SvelteKit uses "File hashing, so that your assets can be cached forever" ([v2 performance][v2-perf]). Its own Node adapter sets `cache-control: public,max-age=31536000,immutable`. It does this only for paths that start with `/<appPath>/immutable/` and get status 200, explicitly "not e.g. version.json" ([adapter-node `handler.js#L50-L59`][node-handler]). adapter-static's Vercel config does the same for `/_app/immutable/.+` ([`platforms.js#L62-L67`][as-platforms]). The `immutable` directive is defined in [RFC 8246][rfc8246].
- **Why HTML needs its own header.**
  - Without `Cache-Control`, caches "MAY assign a heuristic expiration time … (such as the Last-Modified time)". "A typical setting of this fraction might be 10%" ([RFC 9111 §4.2.2][rfc9111-heur]).
  - `StaticFiles` sends `Last-Modified`, so `index.html` could be reused without revalidation after a rebuild. It would then point at hashed chunks that no longer exist.
  - `Cache-Control: no-cache` makes caches revalidate every time ([RFC 9111 §5.2.2.4][rfc9111-nocache]). That revalidation is a cheap 304 thanks to the ETag.
- **Two ways to add the headers** *(both verified)*:
  - **With `Mount`:** subclass `StaticFiles` and override `file_response(...)`. Set the header on the returned response, which also covers the 304 `NotModifiedResponse`. Check `scope["path"]`, since `starlette._utils.get_route_path` is private.
  - **With `app.frontend`:** the static-files class isn't public, so use an `@app.middleware("http")` that sets the header for paths starting with `/_app/immutable/` when the status is 200 or 304.

## Open points

- **Unknown-path behaviour is a choice, not a given.** For a one-URL app there are three options: 404 JSON, the root page with 200 (`frontend` auto), or an SPA shell. The hydrate-at-unknown-URL behaviour was read from source, not tested in a browser.
- **HTTP/1.1 only.** The SvelteKit performance doc says "Ensure your host uses HTTP/2 or newer" because of Vite's many small chunks ([v2-perf]), but uvicorn "currently supports **HTTP/1.1**" ([uvicorn docs][uvicorn]). Build A is about 15 hashed files on a LAN. Kit has `output.bundleStrategy: 'split' | 'single' | 'inline'` ([`options.js`][kit-options-src]); not tested.
- **Compression.** `StaticFiles` won't serve precompressed files. Starlette's `GZipMiddleware` only excludes `text/event-stream` by default, so it would also try to compress `audio/mpeg` streams, including `Range` responses. Not tested.
- **A local `.env` in the Docker build context** would bake `http://localhost:8000` into the bundle unless the build sets `PUBLIC_API_BASE_URL` explicitly (process env wins) or a `.dockerignore` excludes it. This belongs to the image-build issue.
- **SvelteKit 3 / adapter-static 4.** Upgrading means moving off `$env/static/public` and `$app/environment` (deprecated or renamed in v3). The Kit 2 line is still getting releases: 2.70.4 and adapter-static 3.0.11 both came out on 2026-11-05.

[v2-static]: https://github.com/sveltejs/kit/blob/70a5ad21c58266d3e08863b519d9485819b1a776/documentation/docs/25-build-and-deploy/50-adapter-static.md
[v2-spa]: https://github.com/sveltejs/kit/blob/70a5ad21c58266d3e08863b519d9485819b1a776/documentation/docs/25-build-and-deploy/55-single-page-apps.md
[v2-pageopts]: https://github.com/sveltejs/kit/blob/70a5ad21c58266d3e08863b519d9485819b1a776/documentation/docs/20-core-concepts/40-page-options.md
[v2-env]: https://github.com/sveltejs/kit/blob/70a5ad21c58266d3e08863b519d9485819b1a776/documentation/docs/20-core-concepts/70-environment-variables.md
[v2-config]: https://github.com/sveltejs/kit/blob/70a5ad21c58266d3e08863b519d9485819b1a776/documentation/docs/98-reference/50-configuration.md
[v2-faq]: https://github.com/sveltejs/kit/blob/70a5ad21c58266d3e08863b519d9485819b1a776/documentation/docs/60-appendix/10-faq.md
[v2-glossary]: https://github.com/sveltejs/kit/blob/70a5ad21c58266d3e08863b519d9485819b1a776/documentation/docs/60-appendix/60-glossary.md
[v2-perf]: https://github.com/sveltejs/kit/blob/70a5ad21c58266d3e08863b519d9485819b1a776/documentation/docs/40-best-practices/05-performance.md
[v2-changelog]: https://github.com/sveltejs/kit/blob/70a5ad21c58266d3e08863b519d9485819b1a776/packages/kit/CHANGELOG.md
[v3-migrate]: https://github.com/sveltejs/kit/blob/014dfec3df98be8edf6e217e98309c12ba51b4cf/documentation/docs/60-appendix/35-migrating-to-sveltekit-3.md
[kit-config-src]: https://github.com/sveltejs/kit/blob/%40sveltejs/kit%402.70.2/packages/kit/src/core/config/index.js#L22
[kit-options-src]: https://github.com/sveltejs/kit/blob/%40sveltejs/kit%402.70.2/packages/kit/src/core/config/options.js
[kit-builder]: https://github.com/sveltejs/kit/blob/%40sveltejs/kit%402.70.2/packages/kit/src/core/adapt/builder.js#L199
[kit-client]: https://github.com/sveltejs/kit/blob/%40sveltejs/kit%402.70.2/packages/kit/src/runtime/client/client.js#L2995
[kit-env-types]: https://github.com/sveltejs/kit/blob/%40sveltejs/kit%402.70.2/packages/kit/src/runtime/app/env/types.d.ts
[kit-env-static-doc]: https://github.com/sveltejs/kit/blob/%40sveltejs/kit%402.70.2/packages/kit/src/types/synthetic/%24env%2Bstatic%2Bpublic.md
[kit-env-src]: https://github.com/sveltejs/kit/blob/%40sveltejs/kit%402.70.2/packages/kit/src/core/env.js#L119
[kit-utils-env]: https://github.com/sveltejs/kit/blob/%40sveltejs/kit%402.70.2/packages/kit/src/utils/env.js
[kit-dev-src]: https://github.com/sveltejs/kit/blob/%40sveltejs/kit%402.70.2/packages/kit/src/exports/vite/dev/index.js#L420-L446
[kit-public-dts]: https://github.com/sveltejs/kit/blob/%40sveltejs/kit%402.70.2/packages/kit/src/exports/public.d.ts
[as-index]: https://github.com/sveltejs/kit/blob/%40sveltejs/adapter-static%403.0.11/packages/adapter-static/index.js#L9-L41
[as-platforms]: https://github.com/sveltejs/kit/blob/%40sveltejs/adapter-static%403.0.11/packages/adapter-static/platforms.js#L62-L67
[node-handler]: https://github.com/sveltejs/kit/blob/70a5ad21c58266d3e08863b519d9485819b1a776/packages/adapter-node/src/handler.js#L50-L59
[svelte-effect]: https://svelte.dev/docs/svelte/$effect
[vite-server]: https://github.com/vitejs/vite/blob/v8.2.1/docs/config/server-options.md
[vite-preview]: https://github.com/vitejs/vite/blob/v8.2.1/docs/config/preview-options.md
[vite-env]: https://github.com/vitejs/vite/blob/v8.2.1/docs/guide/env-and-mode.md
[vite-env-src]: https://github.com/vitejs/vite/blob/v8.2.1/packages/vite/src/node/env.ts#L98
[vite-proxy-src]: https://github.com/vitejs/vite/blob/v8.2.1/packages/vite/src/node/server/middlewares/proxy.ts#L231
[vite-server-src]: https://github.com/vitejs/vite/blob/v8.2.1/packages/vite/src/node/server/index.ts#L960-L1037
[st-docs]: https://www.starlette.dev/staticfiles/
[st-static-src]: https://github.com/Kludex/starlette/blob/1.3.1/starlette/staticfiles.py#L109-L155
[st-routing-src]: https://github.com/Kludex/starlette/blob/1.3.1/starlette/routing.py
[st-responses-src]: https://github.com/Kludex/starlette/blob/1.3.1/starlette/responses.py#L330-L338
[fa-frontend]: https://fastapi.tiangolo.com/tutorial/frontend/
[fa-static]: https://fastapi.tiangolo.com/tutorial/static-files/
[fa-release]: https://github.com/fastapi/fastapi/blob/0.139.2/docs/en/docs/release-notes.md
[fa-routing-src]: https://github.com/fastapi/fastapi/blob/0.139.2/fastapi/routing.py
[rfc8246]: https://www.rfc-editor.org/rfc/rfc8246
[rfc9111-heur]: https://www.rfc-editor.org/rfc/rfc9111#section-4.2.2
[rfc9111-nocache]: https://www.rfc-editor.org/rfc/rfc9111#section-5.2.2.4
[uvicorn]: https://github.com/Kludex/uvicorn/blob/0.51.0/docs/index.md

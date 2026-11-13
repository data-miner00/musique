# Write the containerization spec

Type: task
Status: resolved
Blocked by: 04, 05, 06

## Question

Synthesize [Serving a static SvelteKit build from FastAPI](01-serving-static-sveltekit-from-fastapi.md), [Packaging a uv-managed FastAPI app in Docker](02-packaging-uv-fastapi-in-docker.md), [How the frontend is built and served](03-frontend-build-and-serving.md), [URL layout and the API address](04-url-layout-and-api-address.md), [Image build](05-image-build.md) and [Compose file and configuration](06-compose-and-configuration.md) into one implementation-ready spec at [`spec.md`](../spec.md), using the `/to-spec` template. This is the map's destination — resolving this issue reaches it.

## Answer

Written on 2026-11-11 to [`spec.md`](../spec.md) using the `/to-spec` template: 42 user stories (owner and developer), implementation decisions for the backend, frontend, image, compose, configuration/docs and CI, the two agreed test seams, out-of-scope list and further notes.

One decision was corrected while writing it rather than reopened as an issue, since it was a factual mistake rather than an open choice: the container smoke test's sample is a tiny **real** mp3 committed as a fixture, not a fake one — the real scan skips files `mutagen` can't parse (see the comment on [Image build](05-image-build.md)).

The map's one patch of fog — how the image reaches the target machine (registry, multi-arch) — sits beyond this destination: building on the machine works everywhere, ARM included. It moves to Out of scope as a later effort for once the machine is chosen.

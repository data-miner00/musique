# Write the MVP spec document

Type: task
Status: resolved

## Question

Synthesize [Destination & MVP shape](01-destination-and-mvp-shape.md), [Backend library scanning approach](02-backend-library-approach.md), [Auth & deployment scope](03-auth-and-deployment-scope.md), [Frontend UI scope](04-frontend-ui-scope.md), and [Search approach](05-search-approach.md) into a single implementation-ready spec document (API surface, file/folder layout, component wiring) that can be handed off for building. This is the map's destination — closing this ticket reaches it.

## Answer

Written to [`spec.md`](../spec.md) (25 user stories, backend + frontend implementation decisions, out-of-scope list). Two additional decisions surfaced and were resolved directly in the spec rather than as separate tickets, since they were mechanical consequences of already-closed decisions, not new open branches:

- Playlists are derived from **top-level** subfolders only (not every nesting level); tracks sitting directly in the music root with no subfolder get grouped into an implicit "root" playlist so nothing is dropped.
- `next`/`previous` keep the existing wrap-at-boundary behavior already implemented in the mock store — no new design needed there.

Destination reached — this map has no more open tickets.

## Comments

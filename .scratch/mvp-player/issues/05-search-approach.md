# Search approach

Type: grilling
Status: resolved

## Question

Does search get a dedicated backend endpoint, or a client-side filter over the already-loaded track list?

## Answer

**Client-side filter** over the track list already loaded for the flat Library view (see [Backend library scanning approach](02-backend-library-approach.md)) — a personal library is small enough to load in full, so a dedicated search endpoint adds backend surface for no real MVP-scale benefit.

Noted for later (not decided, not scheduled): the user is considering outsourcing search to **Meilisearch** as a distinct future feature, replacing the client-side filter. Revisit as its own effort if/when pursued.

## Comments

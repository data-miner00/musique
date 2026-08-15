# Self-hosted Music Player — MVP

Type: wayfinder:map

## Destination

An implementation-ready **spec document** for a self-hosted music player MVP: play/pause/skip/previous playback of mp3 files found in a mounted folder, reusing the existing mock frontend UI shell (`frontend/src/lib/player/`) wired to a real FastAPI backend that scans the folder and streams files. `TODO.md` at the repo root is the long-term project this MVP is deliberately carved out of — not everything there belongs here.

## Notes

- Domain: personal, single-user, self-hosted music player. Backend: FastAPI + `mutagen`. Frontend: SvelteKit, with a pre-existing mock player UI (playlists/search/library/lyrics/queue/likes/mobile-nav, all fake data) already in the tree.
- Consult `docs/agents/domain.md` and `docs/agents/issue-tracker.md` for this repo's conventions.
- The destination is a spec artifact, not code — the final ticket on this map ([Write the MVP spec document](issues/06-write-mvp-spec.md)) is to write it.

## Decisions so far

- [Destination & MVP shape](issues/01-destination-and-mvp-shape.md) — destination is an implementation-ready spec, not code; `TODO.md` stays the long-term reference.
- [Backend library scanning approach](issues/02-backend-library-approach.md) — no DB, in-memory recursive scan, `mutagen` tags with filename fallback, flattened list ordered artist→album→track→filename.
- [Auth & deployment scope](issues/03-auth-and-deployment-scope.md) — auth and Docker packaging both deferred past this MVP.
- [Frontend UI scope](issues/04-frontend-ui-scope.md) — keep the mock UI shell; wire up core transport + folder-derived playlists; lyrics/likes/shuffle/repeat/queue/seek/cover-art/visualizer stay hidden or fake for now; mobile nav stays functional.
- [Search approach](issues/05-search-approach.md) — client-side filter over the loaded track list; Meilisearch noted as a possible distinct future feature.
- [Write the MVP spec document](issues/06-write-mvp-spec.md) — spec published to [`spec.md`](spec.md).

## Not yet specified

(none — destination reached, no open tickets remain)

## Out of scope

- Auth (username/password + session cookie) — see [Auth & deployment scope](issues/03-auth-and-deployment-scope.md).
- Docker packaging (Dockerfile/compose) — see [Auth & deployment scope](issues/03-auth-and-deployment-scope.md).
- Seeking/scrubbing within a track — see [Frontend UI scope](issues/04-frontend-ui-scope.md).
- Synced lyrics screen — its own Backlog feature in `TODO.md` (`.lrc`/LRCLIB integration); see [Frontend UI scope](issues/04-frontend-ui-scope.md).
- Likes, Shuffle, Repeat, Queue — see [Frontend UI scope](issues/04-frontend-ui-scope.md).
- True playlist CRUD + SQLite persistence — MVP uses folder-derived read-only playlists instead; see [Frontend UI scope](issues/04-frontend-ui-scope.md).
- Real cover art extraction — placeholder gradient kept; see [Frontend UI scope](issues/04-frontend-ui-scope.md).
- Audio-reactive visualizer — kept decorative/fake; see [Frontend UI scope](issues/04-frontend-ui-scope.md).
- Server-side/Meilisearch-backed search — see [Search approach](issues/05-search-approach.md).

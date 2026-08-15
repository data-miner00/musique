# 01 — Backend library scan & streaming API

**What to build:** On startup, the backend scans the configured music root for mp3 files, reads their metadata (falling back to filename when tags are missing), derives one playlist per top-level subfolder (plus an implicit playlist for tracks sitting directly in the root), and orders everything by artist → album → track number → filename. Exposes endpoints to list playlists, list tracks (flat and per-playlist), and stream a track's audio bytes. Manually verifiable via curl/browser against a real folder of mp3s.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] `mutagen` is added as a backend dependency.
- [x] The music root path is configurable via an environment variable.
- [x] Non-mp3 files in the mounted folder are skipped and never appear in scan results.
- [x] A track's title/artist/album/track number/duration are read from its tags when present.
- [x] A track with missing or unreadable tags still appears, labeled from its filename.
- [x] `GET /tracks` returns the full flat track list ordered by artist → album → track number → filename.
- [x] `GET /playlists` returns one playlist per top-level subfolder of the music root, plus one playlist for tracks sitting directly in the root (when any exist).
- [x] `GET /playlists/{id}/tracks` returns that playlist's tracks in the same ordering.
- [x] `GET /stream/{trackId}` returns the track's raw audio bytes with an `audio/mpeg` content type.
- [x] Restarting the backend re-scans the folder from scratch (no stale state, no crash on an empty folder).

## Comments

Implemented in `backend/library.py` (scan/tag/ordering logic, `Library` container) and `backend/main.py` (FastAPI wiring, lifespan-driven scan on startup). Verified via manual smoke checks (fixture mp3s with tagged/untagged/corrupt/non-mp3 files, real HTTP round trip through every endpoint), plus automated tests in `backend/tests/`: `test_library.py` unit-tests `scan_library`'s ordering/grouping, filename fallback, and corrupt/non-mp3 skipping (mutagen mocked, no fixture binaries needed); `test_main.py` integration-tests every endpoint in `main.py` via `TestClient` (happy path + 404s), with `scan_library` stubbed so the test targets routing/response handling rather than re-testing the scan. Run via `uv run pytest`.

`/code-review` (Standards + Spec axes) found no hard violations. Applied one fix from it: collapsed four parallel module-level globals into a single `Library` container (also resolved a duplicated index-building smell), and added a log line when a corrupt/unparseable `.mp3` file is skipped. Left as judgement calls, not changed: `PlaylistOut.track_count` and alphabetical playlist-list ordering (harmless additions beyond the ticket's literal ask); an untagged track's `track_number` defaults to `0` in the sort key (unspecified either way).

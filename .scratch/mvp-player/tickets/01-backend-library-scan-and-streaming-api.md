# 01 — Backend library scan & streaming API

**What to build:** On startup, the backend scans the configured music root for mp3 files, reads their metadata (falling back to filename when tags are missing), derives one playlist per top-level subfolder (plus an implicit playlist for tracks sitting directly in the root), and orders everything by artist → album → track number → filename. Exposes endpoints to list playlists, list tracks (flat and per-playlist), and stream a track's audio bytes. Manually verifiable via curl/browser against a real folder of mp3s.

**Blocked by:** None — can start immediately.

**Status:** ready

- [ ] `mutagen` is added as a backend dependency.
- [ ] The music root path is configurable via an environment variable.
- [ ] Non-mp3 files in the mounted folder are skipped and never appear in scan results.
- [ ] A track's title/artist/album/track number/duration are read from its tags when present.
- [ ] A track with missing or unreadable tags still appears, labeled from its filename.
- [ ] `GET /tracks` returns the full flat track list ordered by artist → album → track number → filename.
- [ ] `GET /playlists` returns one playlist per top-level subfolder of the music root, plus one playlist for tracks sitting directly in the root (when any exist).
- [ ] `GET /playlists/{id}/tracks` returns that playlist's tracks in the same ordering.
- [ ] `GET /stream/{trackId}` returns the track's raw audio bytes with an `audio/mpeg` content type.
- [ ] Restarting the backend re-scans the folder from scratch (no stale state, no crash on an empty folder).

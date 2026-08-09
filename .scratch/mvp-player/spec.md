# Self-hosted Music Player — MVP

## Problem Statement

The user has a personal collection of mp3 files sitting in a folder and wants a private, self-hosted web page to listen to them, instead of relying on a third-party streaming service. Right now there's no way to actually hear anything through the app: the frontend is a fully-designed player UI wired to fake, hard-coded songs, and the backend does nothing but answer a health check.

## Solution

Ship a working MVP: open the web app and see the real mp3s found in the mounted music folder, grouped into playlists by their containing subfolder. Pick a track and it plays for real, with working pause, skip, and previous controls, auto-advancing to the next track when one finishes. The rest of the already-built UI (search, cover art, lyrics, likes, shuffle, repeat, queue, mobile nav) either gets wired to simple, low-cost real data (search, playlists) or stays exactly as it looks today — a visual placeholder that doesn't yet do anything.

## User Stories

1. As a user, I want to open the web app and see my real music library loaded from the mounted folder, so that I don't have to look at fake placeholder songs.
2. As a user, I want tracks to show their real title and artist read from the file's tags, so that I can tell what I'm looking at.
3. As a user, I want a track whose file has no readable tags to still show up, using its filename as a fallback label, so that an untagged file doesn't just disappear from my library.
4. As a user, I want each top-level subfolder in my music folder to appear as a playlist named after that folder, so that my existing folder organization (by artist/album) is preserved without extra work.
5. As a user, I want tracks placed directly in the music folder root (not inside any subfolder) to still appear somewhere sensible, so that they aren't silently dropped just because they're not organized into a subfolder.
6. As a user, I want tracks within a playlist and in the overall library to be listed in a stable, sensible order (artist, then album, then track number, then filename), so that album track order isn't scrambled.
7. As a user, I want to click a track and have it start playing immediately.
8. As a user, I want a pause/play button that actually pauses and resumes the real audio, so that I can stop playback without losing my place.
9. As a user, I want a "next" button that moves to the next track in whatever list I'm currently browsing (a playlist or the full library) and plays it.
10. As a user, I want a "previous" button that moves to the previous track in that same list and plays it.
11. As a user, I want playback to automatically advance to the next track when the current one finishes, so that I don't have to manually click "next" after every song.
12. As a user, I want "next" from the last track and "previous" from the first track to behave predictably (wrapping around) rather than erroring or freezing.
13. As a user, I want to see the currently playing track's elapsed time and total duration, so that I have a sense of playback progress.
14. As a user, I want to adjust playback volume from the now-playing bar, so that I can control loudness without touching my OS volume.
15. As a user, I want to browse "Your Library" and see all my playlists (folders), so that I can jump into any of them.
16. As a user, I want to type into the Search box and see the real track list filtered by title/artist/album as I type, so that I can quickly find a song without browsing folders.
17. As a user, I want the app to be usable on a mobile-sized browser window (mini player, mobile nav), so that I can control playback from my phone on the same LAN.
18. As a user, I want cover art to show a placeholder rather than a broken image, so that the UI still looks visually complete without needing real embedded-art extraction.
19. As a user, I want the Like, Shuffle, Repeat, and Queue buttons to remain visible and clickable exactly as they look today, so that the UI doesn't look broken or incomplete even though those features don't change playback behavior yet.
20. As a user, I want the Lyrics toggle to not attempt to show any real lyrics, so that clicking it doesn't error or display fake data.
21. As a user, I want the backend to serve the actual audio bytes for a selected track over HTTP, so that the browser can play the real file.
22. As a user, I want to run the MVP locally with the existing `uv run` / `npm run dev` workflows, without needing Docker, so that I can try it immediately during development.
23. As a user, I want the music folder path to be configurable via an environment variable, so that I can point the backend at wherever my mp3s actually live without editing code.
24. As a user, I want non-mp3 files in the mounted folder to be silently skipped during scanning, so that the app doesn't crash or show garbage entries.
25. As a user, I want the library to be scanned automatically when the backend starts, so that I don't have to trigger anything manually.

## Implementation Decisions

**Backend (FastAPI)**

- Library scanning: on startup, recursively walk a configured music root directory (env var, e.g. `MUSIC_DIR`) for `.mp3` files, building an in-memory list of tracks. No database, no persistence — the scan result lives in memory and is rebuilt on restart.
- Metadata: read via `mutagen` (title, artist, album, track number, duration). Missing or unreadable tags fall back to the filename (and an "Unknown Artist"/"Unknown Album" placeholder where needed). `mutagen` needs to be added to `backend/pyproject.toml` — it isn't a dependency yet.
- Non-`.mp3` files are skipped during the scan.
- Track identity: a stable id derived from the track's path relative to the music root.
- Track ordering: artist → album → track number → filename, applied both to the flat library list and to each derived playlist's track list.
- Playlists are derived, not stored: one playlist per **top-level** subfolder of the music root (folder name = playlist name). Tracks living directly in the music root, with no subfolder, are grouped into a single implicit "root" playlist so they're never dropped from playlist browsing. Tracks in deeper nested subfolders belong to their top-level ancestor folder's playlist; the flat library/search view still lists every track regardless of nesting depth.
- Endpoints:
  - `GET /tracks` — the full flat, ordered track list.
  - `GET /playlists` — the derived playlist list.
  - `GET /playlists/{id}/tracks` — the ordered tracks belonging to one playlist.
  - `GET /stream/{trackId}` — streams the raw audio bytes for a track (`Content-Type: audio/mpeg`). No HTTP Range support required for MVP (seeking is out of scope) — see Further Notes for a caveat.
  - No auth, no playlist CRUD, no `/cover`, no `/search` endpoint (search is client-side).

**Frontend (SvelteKit)**

- `store.svelte.ts` gains an async load step: on startup, fetch `/playlists` and `/tracks` and replace the current hard-coded `PLAYLISTS` / `TRACKS_BY_PLAYLIST` mock data with the real fetched data.
- The `Track` shape gains a real stream URL (`/stream/{id}`), used by an actual `HTMLAudioElement` the store drives directly.
- `togglePlay`, `nextTrack`, `prevTrack`, and `setVolume` operate on this real audio element instead of the current `setInterval`-based fake progress simulator. Elapsed time / duration come from the element's real playback events (`timeupdate`, `loadedmetadata`) instead of a fabricated ratio.
- `nextTrack` / `prevTrack` keep the existing wrap-at-boundary behavior (advancing past the last track wraps to the first, and vice versa) already implemented in the store — no behavior change needed there beyond swapping the underlying data source from mock to real.
- The audio element's `ended` event triggers auto-advance by calling the existing `nextTrack` logic.
- `SearchView` gets a real text input replacing its "not wired up yet" placeholder, filtering the already-fetched flat track list client-side by title/artist/album substring match (case-insensitive).
- Likes, Shuffle, Repeat, Queue, Lyrics: their existing UI controls and local toggle state stay exactly as implemented today (no removal, no behavior change) — they keep visually toggling but have no effect on playback order, persistence, or real lyric content.
- `Cover.svelte` is unchanged (hue-based placeholder gradient); the hue can be derived deterministically from the track/playlist id (e.g. a simple hash) instead of a hand-picked mock value, since real data has no designer-assigned hue.
- The visualizer bars in `NowPlayingOverlay` are unchanged — they keep their existing fake sine-wave animation, not wired to real audio analysis.
- `MobileMiniPlayer` / `MobileNav` are structurally unchanged; they just read from the now-real store state.

## Testing Decisions

No automated tests for this project — explicit user preference, not a gap to fill in later within this spec's scope.

## Out of Scope

- Auth (username/password + session cookie).
- Docker packaging (Dockerfile / docker-compose).
- Seeking/scrubbing within a track, and the HTTP Range support that would require.
- Synced lyrics (its own Backlog feature in `TODO.md` — `.lrc` sidecar files and/or LRCLIB lookup).
- Real behavior for Likes, Shuffle, Repeat, and Queue (UI stays, functionality doesn't).
- True playlist CRUD and SQLite persistence — playlists are folder-derived and read-only for MVP.
- Real cover art extraction (embedded art via `mutagen`, `/cover` endpoint).
- Audio-reactive visualizer.
- Server-side or Meilisearch-backed search.

## Further Notes

- This spec captures only the MVP slice of the long-term project described in `TODO.md`; it was reached via the "Self-hosted Music Player — MVP" wayfinder map (`.scratch/mvp-player/map.md`), whose closed decision tickets hold the detailed rationale behind each choice above.
- Browsers commonly issue HTTP Range requests for `<audio>` playback even without user-initiated seeking (for buffering). `GET /stream/{trackId}` not supporting Range was a conscious MVP simplification, not a belief that it'll never matter — revisit if playback turns out choppy in practice.
- The user is considering Meilisearch as a future replacement for the client-side search filter; that's a distinct future effort, not part of this MVP.

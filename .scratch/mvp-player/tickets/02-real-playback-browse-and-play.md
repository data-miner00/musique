# 02 — Real playback: browse playlists & play tracks end-to-end

**What to build:** Opening the app shows real playlists — the folder-derived ones from the backend, plus a synthetic "All Tracks" playlist containing every track in the library — instead of mock data. Clicking a playlist (including "All Tracks") shows its real tracks; clicking a track plays it through a real audio element with working play/pause, skip to next, skip to previous, automatic advance when a track ends, and volume control. This is the core MVP experience, demoable end-to-end.

**Blocked by:** 01 — Backend library scan & streaming API

**Status:** done

- [x] Home, Sidebar, and Library screens list the real playlists returned by the backend.
- [x] An "All Tracks" playlist is always present alongside the folder-derived ones, behaving identically to them but containing every track in the library.
- [x] Selecting a playlist shows its real tracks (title, artist, album, duration) instead of mock data.
- [x] Clicking a track starts real audio playback via the backend's streaming endpoint.
- [x] The play/pause button reflects and controls the real audio element's state.
- [x] Skip (next) and previous move to the adjacent track within the currently viewed list and start playing it, wrapping at the ends.
- [x] When a track finishes playing, the next track in the currently viewed list starts automatically.
- [x] The volume control adjusts the real audio element's volume.
- [x] Elapsed time and duration shown in the now-playing bar reflect real playback progress.
- [x] The old mock data (playlists/tracks constants) and the fake progress-interval simulator are removed.

## Comments

Implemented in `frontend/src/lib/player/`: `api.ts` (fetches `/playlists` and `/tracks`, maps backend DTOs to frontend `Track`/`Playlist`, builds each track's `/stream/{id}` URL), `format.ts` (`formatTime` for mm:ss display, `hueForId` deriving a `Cover` hue from a track/playlist id since real data has no designer-assigned hue), and a rewritten `store.svelte.ts` driving a real `HTMLAudioElement` (`timeupdate`/`ended` listeners) instead of the old `setInterval` fake-progress simulator. `data.ts` now only holds the still-fake `LYRICS` placeholder; the mock `PLAYLISTS`/`TRACKS_BY_PLAYLIST` are gone.

The synthetic "All Tracks" playlist is prepended to `player.playlists` (constant id `ALL_TRACKS_PLAYLIST_ID`) and doubles as the canonical full-library lookup: `currentTrack` resolves against it rather than against the currently-browsed list, so the now-playing bar keeps showing the actually-playing track even after navigating to a different playlist (a real requirement once playback is real, not just a mock-data simplification). `tracks` (the "currently viewed list" used by next/prev and click-to-play) is the active playlist's tracks, or the live search results while on the Search screen — `SearchView` was filled in per spec (client-side substring filter over title/artist/album, case-insensitive).

Backend: added permissive `CORSMiddleware` to `main.py` (not in ticket 01's checklist) since the SvelteKit dev server and FastAPI dev server run on different ports/origins and the browser was blocking the fetches without it. Single-user, no-auth backend, so `allow_origins=["*"]` was judged low-risk.

Judgment call, deviating from the literal ticket text: per spec's "Out of Scope" (seeking/scrubbing, since `/stream` doesn't guarantee HTTP Range support), `seek()` updates the displayed progress but does not move the real audio element's position — consistent with how Likes/Shuffle/Repeat/Queue stay visually interactive but functionally inert. Manually verified end-to-end against a real backend and a fixture music folder (generated mp3s with real tags/audio via `lameenc`, mixed root-level and subfolder tracks): `/playlists`, `/tracks`, `/stream/{id}` all returned correct real data with CORS headers present; `svelte-check`, `eslint`, `vitest` (13 tests, including the pre-existing `ProgressBar` keyboard-seek browser test), and `pytest` (9 tests) all pass. Could not drive an actual browser click-through (no browser automation tool available in this environment) — the play/pause/skip/volume wiring was verified by code review and by the store's unit tests rather than a live click-through.

`/code-review` (Standards + Spec axes) found no hard violations on either axis. Spec axis: noted the store only listens to `timeupdate`/`ended` rather than also `loadedmetadata` as spec.md's implementation notes describe — harmless, since duration is read live from `audio.duration` on every tick rather than cached from `loadedmetadata`; left as-is. Standards axis flagged two judgement calls, both left unchanged as reasonable MVP trade-offs: `SearchView`'s new track-row markup duplicates the existing (pre-existing, not introduced here) shape already duplicated between `PlaylistView`'s mobile and desktop layouts — extracting a shared row component would mean touching ticket 01/02-unrelated `PlaylistView` structure, out of this ticket's scope; and `currentTrack`/`activePlaylist` fall back to `EMPTY_TRACK`/`EMPTY_PLAYLIST` sentinel objects rather than `null`, which avoids null-guarding every template that reads `player.currentTrack.*` (`NowPlayingBar`, `NowPlayingOverlay`, `MobileMiniPlayer`) at the cost of the sentinel technically satisfying the `Track`/`Playlist` type without being a real track/playlist.

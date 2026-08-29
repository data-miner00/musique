# 03 — Real search filter

**What to build:** Typing into the Search screen's input filters the real, already-loaded track list live by title, artist, or album, replacing the current "not wired up yet" placeholder.

**Blocked by:** 02 — Real playback: browse playlists & play tracks end-to-end

**Status:** done

- [x] The Search screen has a working text input.
- [x] Typing filters the visible track list to tracks whose title, artist, or album contains the typed text (case-insensitive substring match).
- [x] Clicking a track in the filtered results plays it, same as everywhere else in the app.
- [x] Clearing the input restores the full track list.
- [x] Filtering happens client-side over the track list already loaded into the store — no new backend endpoint.

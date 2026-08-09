# 02 — Real playback: browse playlists & play tracks end-to-end

**What to build:** Opening the app shows real playlists — the folder-derived ones from the backend, plus a synthetic "All Tracks" playlist containing every track in the library — instead of mock data. Clicking a playlist (including "All Tracks") shows its real tracks; clicking a track plays it through a real audio element with working play/pause, skip to next, skip to previous, automatic advance when a track ends, and volume control. This is the core MVP experience, demoable end-to-end.

**Blocked by:** 01 — Backend library scan & streaming API

**Status:** ready

- [ ] Home, Sidebar, and Library screens list the real playlists returned by the backend.
- [ ] An "All Tracks" playlist is always present alongside the folder-derived ones, behaving identically to them but containing every track in the library.
- [ ] Selecting a playlist shows its real tracks (title, artist, album, duration) instead of mock data.
- [ ] Clicking a track starts real audio playback via the backend's streaming endpoint.
- [ ] The play/pause button reflects and controls the real audio element's state.
- [ ] Skip (next) and previous move to the adjacent track within the currently viewed list and start playing it, wrapping at the ends.
- [ ] When a track finishes playing, the next track in the currently viewed list starts automatically.
- [ ] The volume control adjusts the real audio element's volume.
- [ ] Elapsed time and duration shown in the now-playing bar reflect real playback progress.
- [ ] The old mock data (playlists/tracks constants) and the fake progress-interval simulator are removed.

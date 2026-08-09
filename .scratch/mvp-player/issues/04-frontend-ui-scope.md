# Frontend UI scope — which mock features go live

Type: grilling
Status: resolved

## Question

`frontend/src/lib/player/` already contains a fully-built *mock* player UI (playlists, search, library, lyrics, queue, shuffle/repeat, likes, mobile nav, a fake audio visualizer, cover-art placeholders) wired to fake in-memory data. For each piece: does it get wired to real data for this MVP, stay as a stub/hidden, or get removed?

## Answer

Keep the whole mock UI component shell (don't rebuild from scratch), but only wire up what the MVP needs; the rest stays present-but-non-functional/hidden:

- **Core transport** (now-playing bar, progress bar, play/pause/skip/previous, auto-advance on track end, volume): wired to a real `<audio>` element and the real backend track list. In scope.
- **Seeking/scrubbing** within a track: **out of scope** — not requested, and it would require HTTP Range support on the streaming endpoint beyond what pause/skip/previous need.
- **Playlists**: folder-derived — each subfolder directly under the mount becomes one read-only playlist (named after the folder). No create/rename/delete/CRUD. Real TODO-Phase-2/3 playlist entities are deferred.
- **Search**: see [Search approach](../issues/05-search-approach.md).
- **Lyrics screen**: **hidden/deferred**. `TODO.md` lists synced lyrics as its own Backlog feature (`.lrc` sidecar files and/or LRCLIB API lookup) with real complexity — not a checkbox to tick while wiring up the rest of the shell.
- **Likes, Shuffle, Repeat, Queue**: **out of scope** for this MVP — screens may exist in the shell but stay non-functional/hidden.
- **Cover art**: keep the existing hue-based gradient placeholder (`Cover.svelte`). No real embedded-art extraction or `/cover` endpoint.
- **Visualizer bars** (Now Playing overlay): stay decorative/fake (not driven by a real Web Audio `AnalyserNode`), or hidden. Unrelated to core playback.
- **Mobile responsiveness** (`MobileMiniPlayer`, `MobileNav`): kept functional — already built, layout/CSS only, no new data or backend work required.

## Comments

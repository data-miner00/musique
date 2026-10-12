# 02 — Queue, shuffle and repeat

**What to build:** Pressing play on a track captures the list it came from as the queue. Next, previous and auto-advance walk that queue no matter what is browsed afterwards. Shuffle and Repeat become real, the queue panel shows what plays next, Previous restarts a song that is already under way, and the big Play button on a playlist page starts that playlist.

**Blocked by:** 01 — Seeking

**Status:** done

- [x] Playing a track from a playlist or from search results captures that list as the queue; editing the search box or browsing elsewhere afterwards doesn't change it.
- [x] Next, previous and auto-advance follow the queue, including from the Search screen with an empty box and after opening another playlist.
- [x] Repeat cycles off → all → one, with a "1" badge on the icon for repeat-one.
- [x] Repeat off: after the last track (or Next on it) the player rests on the first track of the queue, paused at 0:00.
- [x] Repeat all: the queue wraps in both directions.
- [x] Repeat one: the current song restarts when it ends by itself; Next and Previous still move to the neighbouring track, wrapping at the ends, and repeat-one stays on.
- [x] Shuffle on builds one random order of the queue with the current song first; Next and Previous walk it. Shuffle off carries on from the current song in the original order.
- [x] A shuffled queue with repeat-all reshuffles each lap, never starting with the song that just finished.
- [x] Previous restarts the current song when more than 3 seconds in; otherwise it goes to the previous track. On the first track with repeat off it restarts the song.
- [x] The queue panel lists only the upcoming tracks in play order, under a "Playing from *name*" line ("Search results" for a search). Clicking one jumps to it without rebuilding the queue.
- [x] The overlay's mobile header shows the queue's source name, not the playlist being browsed.
- [x] The Queue button in the desktop bottom bar opens the full-screen overlay with the queue panel showing.
- [x] The big Play button on a playlist page starts that playlist (first track, or a random one with shuffle on) when it isn't what's playing, and pauses or resumes when it is.

## Decisions

Settled by grilling on 2026-10-12.

- **Captured list, no editing.** "Play next", "Add to queue", removing and reordering are a later ticket; they need new controls on every track row.
- **Shuffled order, not random picks**, so Previous returns to what was actually heard and nothing repeats within a lap.
- **Past the end with repeat off returns to the top, paused** — the same rule for a natural end and for a manual Next.
- **Repeat-one only governs a song ending by itself.** Manual skips behave as in repeat-all.
- **Tests are store unit tests only**, one per rule. `PlayerStore`'s constructor takes `{ audio, random }` so shuffle is predictable in tests. Buttons and the panel are checked by driving the real app.

## Out of scope

- Editing the queue (add, remove, reorder).
- Remembering the queue, shuffle or repeat across reloads — the next ticket (shortcuts and remembered state).
- The Lyrics button in the bottom bar, which keeps its current behaviour until lyrics are real.
- A side-panel queue in the main layout.

## Plan

### 1. `frontend/src/lib/player/store.svelte.ts`

- Constructor takes `{ audio, random = Math.random }`.
- New state: `queue` (tracks in play order), `queueSource` (`{ id, name }` of the playlist, or a fixed "Search results" source), `repeatMode` (`'off' | 'all' | 'one'`, replacing `repeatOn`). A private copy of the captured list keeps the original order for un-shuffling.
- New derived: `queueIndex`, `upNext`, `activePlaylistPlaying`.
- `playTrack(id)` captures the on-screen list as the queue (shuffled around the chosen track when shuffle is on), then plays.
- `playFromQueue(id)` jumps within the queue.
- `nextTrack()` and `prevTrack()` walk the queue under the rules above; the audio `ended` event restarts the song in repeat-one and otherwise calls `nextTrack()`.
- `toggleShuffle()` rebuilds the play order around the current song; `cycleRepeat()` replaces `toggleRepeat()`.
- `toggleActivePlaylist()` backs the playlist page's Play button; `openQueue()` backs the bottom bar's Queue button.

### 2. Components

- `Icon.svelte`: add `repeat-one`.
- `NowPlayingBar.svelte`, `NowPlayingOverlay.svelte`: Repeat button cycles and shows the mode; the bar's Queue button calls `openQueue()`.
- New `QueueList.svelte`, used by both queue panels in the overlay: "Playing from" line, the upcoming tracks, and an empty state.
- `NowPlayingOverlay.svelte`: mobile header shows the queue source.
- `PlaylistView.svelte`: Play button calls `toggleActivePlaylist()` and reflects `activePlaylistPlaying`.

### 3. Tests (`store.spec.ts`)

One per rule in the checklist; the two existing wrap-around tests are rewritten for repeat-all, and existing tests move to the options-object constructor.

### 4. Verify

- `npm run test`, `npm run check`, `npm run lint`.
- Drive the real app in a browser against the running dev servers: queue survives browsing, repeat cycle, end-of-queue rest, shuffle order in the panel, Previous restart, playlist Play button, Queue button.

## Comments

Implemented as planned. Two things beyond the plan:

- The overlay hid the cover art on desktop whenever the queue or lyrics panel was open, because the "replace the cover with the panel" branch was written for mobile but applied at every width. Since the bottom bar's Queue button now leads straight to that view, the cover is kept on desktop and only gives way to a panel on mobile.
- The bottom bar's Queue icon no longer lights up, as it always means "open the overlay with the queue".

Repeat-one restarts the song from the `ended` event rather than using the audio element's `loop` flag, so the rule is covered by a store test; the cost is a brief gap at the loop point.

Verified on 2026-10-12: `vitest` (29 tests), `svelte-check` (0 errors), `prettier` and `eslint` (clean). End-to-end in headless Chromium against the running dev servers, reading the real audio element and the app's own store: 33 checks covering every box above at desktop size plus the source name and queue panel on a 390px touch viewport. The seeking checks from ticket 01 were re-run and still pass (32).

As with ticket 01, the Svelte MCP autofixer that `frontend/CLAUDE.md` asks for wasn't loaded in the session, so `svelte-check` and `eslint` stood in for it.

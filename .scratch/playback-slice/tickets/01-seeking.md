# 01 — Seeking

**What to build:** The seek bar in the now-playing bar and the full-screen overlay moves real playback. Clicking, dragging, or pressing the arrow keys on it jumps the audio to that position. The bar gains a visible handle and a finger-sized grab area, and the volume slider (same component) becomes draggable too.

**Blocked by:** none

**Status:** done

- [x] Clicking the seek bar jumps the audio to that position.
- [x] Dragging the seek bar (mouse or touch) previews the position — the bar fill and the elapsed-time label follow the pointer — and the audio jumps once, on release.
- [x] Dragging the volume slider changes the volume live.
- [x] Left/right arrow keys on the seek bar jump ±5 seconds; on the volume slider they keep the ±2% step.
- [x] Seeking while paused stays paused at the new position.
- [x] Seeking with no track loaded does nothing (the bar doesn't move).
- [x] Seeking to the very end lets the track end and auto-advance, with no special handling.
- [x] A round handle shows on hover, keyboard focus, and while dragging.
- [x] The grab area is about 16px tall while the line keeps its current thickness.
- [x] A backend test pins `/stream` answering a Range request with `206` and the requested bytes.

## Decisions

Settled by grilling on 2026-10-12.

- **No backend code change.** `/stream/{id}` already serves Range requests (Starlette 1.3.1 `FileResponse`, `206` verified by hand). Only a regression test is added. The "no HTTP Range support" comment in `seek()` is stale and goes.
- **Drag commits on release for seeking, live for volume.** Live scrubbing means stuttering audio and a burst of range requests.
- **Keyboard step is a `ProgressBar` prop**, given as a ratio. The seek bars pass 5 seconds over the track length; volume keeps the default `0.02`.
- **Tests stay light**: happy path plus key negative paths. `PlayerStore` accepts an optional audio element in its constructor so a fake can be injected in the Node test project.

## Out of scope

- "Previous" restarting the current track when more than ~3 seconds in — belongs to the queue ticket, where next/previous get reworked.
- Hover time tooltip, buffered-range indicator.
- A seek bar in the mobile mini player (seeking on a phone happens in the full-screen overlay).
- Global keyboard shortcuts (space, arrows outside the bar) — its own later ticket.

## Plan

### 1. `frontend/src/lib/player/store.svelte.ts`

- Constructor takes an optional `HTMLAudioElement`; falls back to `new Audio()` in the browser. Listeners attach to whichever is used. `loadLibrary()` still only runs in the browser.
- New `scrubRatio = $state<number | null>(null)` holding the in-drag preview position.
- New `previewSeek(ratio: number | null)`: sets `scrubRatio` (clamped), or clears it on `null`. Ignored with no track loaded.
- `seek(ratio)`: returns early with no track loaded; otherwise clamps, sets `progress`, clears `scrubRatio`, and sets `audio.currentTime = ratio × duration`. Duration is `audio.duration` when finite and positive, else the track's tagged `durationSec` (metadata may not have loaded yet).
- `elapsedLabel` derives from `scrubRatio ?? progress`, so the label previews during a drag.
- New derived `seekStep`: `5 / durationSec`, or `0` when there is no track.
- `timeupdate` keeps writing `progress` during a drag; the preview wins for display only.

### 2. `frontend/src/lib/player/components/ProgressBar.svelte`

- Props: keep `value`, `onSeek`, `height`, `fillColor`. Add `step = 0.02`, `live = false`, and optional `onPreview: (ratio: number | null) => void`.
- Replace `onclick` with pointer events and pointer capture:
  - `pointerdown` / `pointermove`: compute the ratio; when `live`, call `onSeek`; otherwise remember it locally and call `onPreview(ratio)`.
  - `pointerup`: call `onSeek(ratio)` once, then `onPreview(null)`.
  - `pointercancel`: commit nothing, call `onPreview(null)`.
- The fill shows the local drag ratio while dragging, else `value`.
- Arrow keys call `onSeek(value ± step)`.
- Markup: the `role="slider"` element becomes a ~16px-tall transparent grab area with `touch-action: none`, wrapping the visible line (still `height` px) and a ~12px round handle positioned at the fill edge. The handle is hidden by default and shown on hover, `focus-visible`, and while dragging.

### 3. Call sites

- `NowPlayingBar.svelte` and `NowPlayingOverlay.svelte` seek bars: pass `onPreview={(r) => player.previewSeek(r)}` and `step={player.seekStep}`.
- `NowPlayingBar.svelte` volume slider: pass `live`.

### 4. Tests

- `store.spec.ts`
  - New: with a fake audio element injected and a track playing, `seek(0.5)` sets `currentTime` to half the track length.
  - New: `seek()` with no track loaded leaves `progress` at 0 and the fake audio untouched.
  - Adjusted: the clamp test plays a track first.
- `ProgressBar.svelte.spec.ts`
  - New: a drag calls `onSeek` once, with the release position.
  - Adjusted: the arrow-key test passes an explicit `step`.
- `backend/tests/test_main.py`
  - New: `GET /stream/track-1` with `Range: bytes=0-3` returns `206`, body `b"fake"`, and a matching `Content-Range`.

### 5. Verify

- `npm run test`, `npm run check`, `npm run lint` in `frontend/`; `uv run pytest` in `backend/`.
- Click through in a real browser against the running dev servers: click, drag, arrow keys, seek while paused, seek to the end, volume drag, and the overlay at a phone-sized viewport.

## Comments

Implemented as planned, with one change of mechanism: the in-drag position lives only in the store (`scrubRatio`, exposed to the seek bars as `displayProgress`) instead of also being kept locally in `ProgressBar`. The component stays controlled and stateless about position, and "no track loaded: the bar doesn't move" falls out of the store ignoring the preview rather than needing a `disabled` prop. `ProgressBar` clamps pointer ratios itself, since pointer capture makes out-of-range positions routine.

Verified on 2026-10-12: `vitest` (16 tests), `svelte-check` (0 errors), `eslint` (clean), `pytest` (10 tests). End-to-end in headless Chromium against the running dev servers, desktop and a 390px touch viewport, reading the real audio element: click, drag preview and commit-on-release, ±5s arrow keys, seek while paused, live volume drag and clamp, handle visibility, seek-to-end auto-advance, and `206` range responses for the seeks. Seeking to the end while paused sits there paused; pressing play then advances to the next track.

Not done with the Svelte MCP autofixer that `frontend/CLAUDE.md` asks for — the server wasn't loaded in the session — so `svelte-check` and `eslint` stood in for it.

Found but left alone, both older than this ticket: `npm run lint` fails at its Prettier step on files with CRLF line endings (Windows checkout with `core.autocrlf=true`), and the Manrope font URL in `layout.css` returns 404, so the UI renders in the fallback font.

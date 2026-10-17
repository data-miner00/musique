# 03 — Keyboard shortcuts and remembered state

**What to build:** The player responds to app-wide keyboard shortcuts and to the OS media controls, gains a mute, and shows its shortcuts in a help panel. Volume, shuffle, repeat, the queue, the current song and the position in it survive a reload.

**Blocked by:** 02 — Queue, shuffle and repeat

**Status:** done

Shortcuts

- [x] Space plays or pauses, even when a button has focus; buttons are still activated with Enter.
- [x] ← / → seek back / forward 5 seconds; Shift + ← / → go to the previous / next track.
- [x] Shift + ↑ / ↓ change the volume by 5%; plain ↑ / ↓ still scroll.
- [x] M mutes and unmutes, S toggles shuffle, R cycles repeat.
- [x] "/" opens the Search screen with the search box focused; Esc closes the help panel, or the full-screen view when no help panel is open.
- [x] Shortcuts are ignored while typing in a text field (Esc excepted) and when Ctrl, Alt or the Windows/Command key is held.
- [x] A focused seek or volume bar keeps its own plain ← / → behaviour.

Mute

- [x] The speaker icon is a button that mutes and unmutes; unmuting returns to the previous level.
- [x] While muted the volume bar shows empty, and changing the volume unmutes.

Help panel

- [x] "?" opens a centred panel over a dimmed page listing the shortcuts in three groups: playback, volume, navigation.
- [x] A keyboard icon at the right end of the top header opens it too, on desktop only.
- [x] It closes with Esc, "?" again, its close button, or a click outside the box; the other shortcuts keep working while it is open.

OS media controls

- [x] Play, pause, next, previous and seek from keyboard or headset media keys and from a phone's lock screen control the player.
- [x] The OS shows the current song's title, artist and album.

Remembered state

- [x] After a reload the volume, mute, shuffle and repeat mode are as they were left.
- [x] After a reload the queue, its "Playing from" source, the current song and the position in it are restored, paused; Play or Space continues from there.
- [x] The position is saved every 5 seconds while playing, and on pause, seek, track change and when the tab is hidden or closed. It never expires.
- [x] Tracks that no longer exist are dropped from the restored queue; if the current song is gone, the player rests on the first remaining track.
- [x] Blocked or corrupt storage is ignored and the app starts fresh.

## Decisions

Settled by grilling on 2026-10-12 and 2026-10-13.

- **Space always plays or pauses** outside text fields, as in Spotify and YouTube, so it never re-presses the last clicked button.
- **Volume is on Shift + ↑ / ↓**, not the plain arrows, which keep scrolling long track lists.
- **Discoverability is a help panel**, with a header button so it can be found without knowing the "?" key. No per-button tooltips.
- **State lives in this browser's `localStorage`.** Each device remembers its own; cross-device resume waits for the database. With two tabs open the last one to save wins.
- **Restored playback is always paused.** Browsers block sound that starts without a click.
- **Likes and "where you were" (screen, open playlist, search text) are not remembered.** Likes belong on the server with SQLite.
- **Tests**: unit tests for the key mapping and for the store's remembering and mute. `PlayerStore` takes a `storage` option like `audio` and `random`. The OS media controls and the key handling in the page are checked in a real browser.

## Out of scope

- A shortcut for Like.
- Live sync between tabs or devices.
- Lock-screen artwork (no cover art yet).
- Keeping the Play button in step with pauses the OS makes by itself, such as a phone call taking audio focus.

## Plan

### 1. `frontend/src/lib/player/shortcuts.ts` (new)

- `shortcutFor(event)`: a pure function from a key event to an action name, or `null`. It applies the typing, modifier and focused-slider rules.
- `SHORTCUT_HELP`: the three groups of rows the help panel renders.

### 2. `frontend/src/lib/player/store.svelte.ts`

- New `storage` constructor option, defaulting to `localStorage` in the browser.
- New state: `muted`, `showShortcuts`.
- New methods: `play()`, `pause()` (used by `togglePlay()` and the media controls), `seekBy(seconds)`, `nudgeVolume(delta)`, `toggleMute()`, `toggleShortcuts()`, `closeShortcuts()`. `setVolume()` unmutes.
- Saving: two keys, so the frequent write stays small with a large library.
  - `musique:queue`: play order, original order and source. Written when the queue changes.
  - `musique:playback`: current song id, position, volume, mute, shuffle, repeat. Written on each of the triggers above.
- `restoreSaved()`: called by `loadLibrary()` once tracks are loaded, which is also after hydration, so the server-rendered page and the first client render agree. Nothing is saved until a restore has been attempted, so a reload during startup or a failed library fetch can't overwrite the saved state with defaults.

### 3. `frontend/src/lib/player/media-session.svelte.ts` (new)

- `connectMediaSession(player)`: registers the action handlers and keeps the metadata and playback state in step with the store. Does nothing where `navigator.mediaSession` is missing.

### 4. Components

- `routes/+page.svelte`: window key handlers that run `shortcutFor` and call the store; the keyboard button in the header; renders the help panel; calls `connectMediaSession`.
- New `ShortcutsPanel.svelte`: the help dialog.
- `Icon.svelte`: add `volume-muted` and `keyboard`.
- `NowPlayingBar.svelte`: speaker icon becomes the mute button; the volume bar shows empty while muted.
- `ProgressBar.svelte`: ignore arrow keys while Shift is held, so Shift + arrows reach the app-wide shortcuts.
- `SearchView.svelte`: an id on the search box so "/" can focus it.

### 5. Tests

- `shortcuts.spec.ts`: each key maps to its action; ignored while typing; ignored with Ctrl/Alt/Meta held.
- `store.spec.ts`: queue, song and position restored paused; volume, mute, shuffle and repeat restored; missing tracks dropped; corrupt storage ignored; mute keeps the level and changing the volume unmutes.

### 6. Verify

- `npm run test`, `npm run check`, `npm run lint`.
- Drive the real app in a browser against the running dev servers: every shortcut, Space after clicking a button, the help panel and its header button, a reload restoring state paused at the saved position, corrupt storage, and the media session's metadata and handlers.
- Re-run the seeking and queue checks from tickets 01 and 02.

## Comments

Implemented as planned. Details settled during the work:

- A held key repeats only for seeking and volume; Space, M, S, R, "/" and "?" act once per press.
- "/" also closes the help panel and the full-screen view, since both would cover the search box.
- The help panel moves focus to its close button when it opens and returns it to wherever it was on closing.
- A focused, muted volume bar steps up from empty (2%) on →, matching what the bar shows; Shift + ↑ steps up from the remembered level.
- The saved position is the last thing written before a tab closes, so a second tab left open still wins on its own next save, as agreed.

Verified on 2026-10-13: `vitest` (39 tests, 10 of them new), `svelte-check` (0 errors), `prettier` and `eslint` (clean). End-to-end in headless Chromium against the running dev servers, reading the real audio element, the app's own store and `navigator.mediaSession`: 49 checks covering every box above, including a real page reload and a start with corrupt storage. The checks from tickets 01 (32) and 02 (33) were re-run and still pass.

Not verified: the OS media controls were exercised by calling the handlers the app registered and reading back the metadata, not with a physical media key or on a phone's lock screen.

As before, the Svelte MCP autofixer that `frontend/CLAUDE.md` asks for wasn't loaded in the session, so `svelte-check` and `eslint` stood in for it.

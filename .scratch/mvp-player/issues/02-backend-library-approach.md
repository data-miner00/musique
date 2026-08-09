# Backend library scanning approach

Type: grilling
Status: resolved

## Question

How does the backend know what tracks exist, where does track metadata (title/artist/album) come from, and how are tracks ordered — given the mounted folder may contain subfolders?

## Answer

- **No database.** Scan the mounted folder recursively on startup (or on-demand) and keep the result in memory. `TODO.md`'s SQLite schema (Phase 1) is explicitly deferred past this MVP — a personal library doesn't need persistence to satisfy play/pause/skip/previous.
- **Metadata**: read ID3 tags via `mutagen` (title/artist/album) when present; fall back to the filename when tags are missing or unreadable.
- **Scanning**: recursive across subfolders, flattened into a single track list (no nested folder browsing UI).
- **Ordering**: alphabetical by artist → album → track number → filename, giving a sane default without needing a library-browsing UI.

## Comments

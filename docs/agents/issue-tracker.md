# Issue tracker: Local Markdown

Issues, tickets, and specs for this repo live as markdown files in `.scratch/`.

Two distinct kinds of item live here, in separate folders — don't mix them:

- **Issue** — a decision or investigation to resolve (from `/wayfinder`). Lives in `issues/`.
- **Ticket** — a vertical build slice to execute (from `/to-tickets`). Lives in `tickets/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- The map (from `/wayfinder`) is `.scratch/<feature-slug>/map.md`
- Issues (from `/wayfinder`) are one file per issue at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01` — see "Wayfinding operations" below
- Tickets (from `/to-tickets`) are one file per ticket at `.scratch/<feature-slug>/tickets/<NN>-<slug>.md`, numbered from `01` — never a single combined file
- Triage state is recorded as a `Status:` line near the top of each file (`ready`/`in-progress`/`done` for tickets; `claimed`/`resolved` for issues — don't confuse the two vocabularies)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/`, in the subfolder matching what's being published — `issues/` for a wayfinder issue, `tickets/` for an implementation ticket (creating the directory if needed).

## When a skill says "fetch the relevant issue" or "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the number directly.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per issue.

- **Map**: `.scratch/<effort>/map.md` — the Notes / Decisions-so-far / Fog body.
- **Issues**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the issue type (`research`/`grilling`/`task`); a `Status:` line records `claimed`/`resolved`. Do not confuse this `Status` with the one used in `/to-tickets`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. An issue is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.

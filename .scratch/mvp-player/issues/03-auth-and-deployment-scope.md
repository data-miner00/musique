# Auth & deployment scope

Type: grilling
Status: resolved

## Question

Are auth (username/password + session cookie) and Docker packaging (Dockerfile/docker-compose) in scope for this MVP?

## Answer

Both **deferred**, out of scope for this MVP:

- **Auth**: orthogonal to "can I play mp3s in the browser." Adding it later doesn't require reworking the player.
- **Docker**: MVP runs locally (`uv run` for the backend, `npm run dev` for the frontend) against a folder path on disk — behaves the same as a mounted volume for MVP purposes. Containerizing is mechanical and safer to do once the app itself works.

## Comments

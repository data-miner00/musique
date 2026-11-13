import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from library import Library, Track, scan_library

MUSIC_DIR = Path(os.environ.get("MUSIC_DIR", "./music")).resolve()

# The frontend's static build. Set in the container; unset in dev, where the
# Vite dev server serves the page and the backend serves only the API.
FRONTEND_DIR = os.environ.get("FRONTEND_DIR")

_library = Library(tracks=[], playlists=[])


def _load_library() -> None:
    global _library
    _library = scan_library(MUSIC_DIR)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    _load_library()
    yield


app = FastAPI(
    title="Musique Backend",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)


api = APIRouter(prefix="/api")


class TrackOut(BaseModel):
    id: str
    title: str
    artist: str
    album: str
    track_number: int | None
    duration: float
    playlist_id: str


class PlaylistOut(BaseModel):
    id: str
    name: str
    track_count: int


def _track_out(track: Track) -> TrackOut:
    return TrackOut(
        id=track.id,
        title=track.title,
        artist=track.artist,
        album=track.album,
        track_number=track.track_number,
        duration=track.duration,
        playlist_id=track.playlist_id,
    )


@api.get("/health")
def health_check():
    return {"status": "ok"}


@api.get("/tracks", response_model=list[TrackOut])
def list_tracks() -> list[TrackOut]:
    return [_track_out(t) for t in _library.tracks]


@api.get("/playlists", response_model=list[PlaylistOut])
def list_playlists() -> list[PlaylistOut]:
    return [
        PlaylistOut(id=p.id, name=p.name, track_count=len(p.track_ids)) for p in _library.playlists
    ]


@api.get("/playlists/{playlist_id}/tracks", response_model=list[TrackOut])
def list_playlist_tracks(playlist_id: str) -> list[TrackOut]:
    playlist = _library.playlists_by_id.get(playlist_id)
    if playlist is None:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return [_track_out(_library.tracks_by_id[track_id]) for track_id in playlist.track_ids]


@api.get("/stream/{track_id}")
def stream_track(track_id: str) -> FileResponse:
    track = _library.tracks_by_id.get(track_id)
    if track is None:
        raise HTTPException(status_code=404, detail="Track not found")
    return FileResponse(MUSIC_DIR / track.relative_path, media_type="audio/mpeg")


app.include_router(api)

IMMUTABLE_ASSETS_PREFIX = "/_app/immutable/"
PAGE_PATHS = {"/", "/index.html"}


def _cache_control_for(path: str) -> str | None:
    if path.startswith(IMMUTABLE_ASSETS_PREFIX):
        return "public, max-age=31536000, immutable"
    if path in PAGE_PATHS:
        return "no-cache"
    return None


class FrontendCacheHeaders:
    """Sets Cache-Control on the frontend build's responses.

    SvelteKit fingerprints everything under /_app/immutable/, so those files
    can be cached for good. The page must always be revalidated (a cheap 304
    on its ETag): a stale copy after a rebuild would point at assets that no
    longer exist.

    A plain ASGI middleware rather than @app.middleware("http"), so audio
    streams pass straight through.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        cache_control = _cache_control_for(scope["path"]) if scope["type"] == "http" else None
        if cache_control is None:
            await self.app(scope, receive, send)
            return

        async def send_with_cache_control(message: Message) -> None:
            if message["type"] == "http.response.start" and message["status"] in (200, 304):
                MutableHeaders(scope=message)["Cache-Control"] = cache_control
            await send(message)

        await self.app(scope, receive, send_with_cache_control)


if FRONTEND_DIR:
    # Unknown paths stay 404: the app has a single page, at "/".
    app.frontend("/", directory=FRONTEND_DIR, fallback=None)
    app.add_middleware(FrontendCacheHeaders)

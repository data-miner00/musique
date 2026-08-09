import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from library import Library, Track, scan_library

MUSIC_DIR = Path(os.environ.get("MUSIC_DIR", "./music")).resolve()

_library = Library(tracks=[], playlists=[])


def _load_library() -> None:
    global _library
    _library = scan_library(MUSIC_DIR)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    _load_library()
    yield


app = FastAPI(title="Musique Backend", lifespan=lifespan)


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


@app.get("/")
def read_root():
    return {"message": "Hello, World!"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/tracks", response_model=list[TrackOut])
def list_tracks() -> list[TrackOut]:
    return [_track_out(t) for t in _library.tracks]


@app.get("/playlists", response_model=list[PlaylistOut])
def list_playlists() -> list[PlaylistOut]:
    return [
        PlaylistOut(id=p.id, name=p.name, track_count=len(p.track_ids)) for p in _library.playlists
    ]


@app.get("/playlists/{playlist_id}/tracks", response_model=list[TrackOut])
def list_playlist_tracks(playlist_id: str) -> list[TrackOut]:
    playlist = _library.playlists_by_id.get(playlist_id)
    if playlist is None:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return [_track_out(_library.tracks_by_id[track_id]) for track_id in playlist.track_ids]


@app.get("/stream/{track_id}")
def stream_track(track_id: str) -> FileResponse:
    track = _library.tracks_by_id.get(track_id)
    if track is None:
        raise HTTPException(status_code=404, detail="Track not found")
    return FileResponse(MUSIC_DIR / track.relative_path, media_type="audio/mpeg")

from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass, field
from pathlib import Path

from mutagen.easyid3 import EasyID3
from mutagen.mp3 import MP3

logger = logging.getLogger(__name__)

UNKNOWN_ARTIST = "Unknown Artist"
UNKNOWN_ALBUM = "Unknown Album"
ROOT_PLAYLIST_NAME = "Root"


@dataclass(frozen=True)
class Track:
    id: str
    title: str
    artist: str
    album: str
    track_number: int | None
    duration: float
    relative_path: Path
    playlist_id: str

    @property
    def sort_key(self) -> tuple[str, str, int, str]:
        return (
            self.artist.lower(),
            self.album.lower(),
            self.track_number if self.track_number is not None else 0,
            self.relative_path.name.lower(),
        )


@dataclass(frozen=True)
class Playlist:
    id: str
    name: str
    track_ids: list[str] = field(default_factory=list)


@dataclass
class Library:
    tracks: list[Track]
    playlists: list[Playlist]
    tracks_by_id: dict[str, Track] = field(init=False)
    playlists_by_id: dict[str, Playlist] = field(init=False)

    def __post_init__(self) -> None:
        self.tracks_by_id = {t.id: t for t in self.tracks}
        self.playlists_by_id = {p.id: p for p in self.playlists}


def _make_id(key: str) -> str:
    return hashlib.sha1(key.encode("utf-8")).hexdigest()[:16]


def _first_tag(tags: EasyID3 | dict, key: str) -> str | None:
    values = tags.get(key)
    if not values:
        return None
    value = str(values[0]).strip()
    return value or None


def _load_track(file_path: Path, relative_path: Path, playlist_id: str) -> Track | None:
    try:
        audio = MP3(file_path)
    except Exception:
        # Not actually a readable mp3 despite the extension (corrupt file,
        # permissions error, ...) - can't be streamed either way, so skip it
        # rather than listing a track that would fail to play.
        logger.warning("Skipping unreadable mp3 file: %s", file_path)
        return None

    duration = float(audio.info.length) if audio.info is not None else 0.0

    try:
        tags = EasyID3(file_path)
    except Exception:
        tags = {}

    title = _first_tag(tags, "title") or file_path.stem
    artist = _first_tag(tags, "artist") or UNKNOWN_ARTIST
    album = _first_tag(tags, "album") or UNKNOWN_ALBUM

    track_number = None
    raw_track = _first_tag(tags, "tracknumber")
    if raw_track:
        raw_track = raw_track.split("/")[0].strip()
        if raw_track.isdigit():
            track_number = int(raw_track)

    return Track(
        id=_make_id(str(relative_path)),
        title=title,
        artist=artist,
        album=album,
        track_number=track_number,
        duration=duration,
        relative_path=relative_path,
        playlist_id=playlist_id,
    )


def scan_library(root: Path) -> Library:
    """Recursively scan `root` for mp3 files.

    One playlist is derived per top-level subfolder; tracks sitting directly
    in `root` are grouped into an implicit "Root" playlist so they aren't
    dropped from playlist browsing.
    """
    if not root.is_dir():
        return Library(tracks=[], playlists=[])

    tracks: list[Track] = []
    playlist_track_ids: dict[str, list[str]] = {}
    playlist_names: dict[str, str] = {}

    for file_path in sorted(root.rglob("*")):
        if not file_path.is_file() or file_path.suffix.lower() != ".mp3":
            continue

        relative_path = file_path.relative_to(root)
        parts = relative_path.parts

        if len(parts) > 1:
            playlist_key = parts[0]
            playlist_name = parts[0]
        else:
            playlist_key = ""
            playlist_name = ROOT_PLAYLIST_NAME

        playlist_id = _make_id(playlist_key)

        track = _load_track(file_path, relative_path, playlist_id)
        if track is None:
            continue

        tracks.append(track)
        playlist_track_ids.setdefault(playlist_id, []).append(track.id)
        playlist_names[playlist_id] = playlist_name

    tracks.sort(key=lambda t: t.sort_key)
    tracks_by_id = {t.id: t for t in tracks}

    playlists = [
        Playlist(
            id=playlist_id,
            name=playlist_names[playlist_id],
            track_ids=sorted(track_ids, key=lambda tid: tracks_by_id[tid].sort_key),
        )
        for playlist_id, track_ids in playlist_track_ids.items()
    ]
    playlists.sort(key=lambda p: p.name.lower())

    return Library(tracks=tracks, playlists=playlists)

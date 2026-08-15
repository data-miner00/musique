import importlib
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path, monkeypatch):
    """A TestClient backed by a stubbed library scan.

    main.py scans MUSIC_DIR at import/lifespan time, so the module is
    reloaded with MUSIC_DIR pointed at a tmp dir, and scan_library is
    replaced with a fixed Library — the scan itself is covered separately
    by test_library.py.
    """
    monkeypatch.setenv("MUSIC_DIR", str(tmp_path))

    import main
    from library import Playlist

    importlib.reload(main)

    (tmp_path / "song.mp3").write_bytes(b"fake-audio-bytes")

    track = main.Track(
        id="track-1",
        title="Test Song",
        artist="Test Artist",
        album="Test Album",
        track_number=1,
        duration=180.0,
        relative_path=Path("song.mp3"),
        playlist_id="playlist-1",
    )
    playlist = Playlist(id="playlist-1", name="Root", track_ids=["track-1"])
    fake_library = main.Library(tracks=[track], playlists=[playlist])

    monkeypatch.setattr(main, "scan_library", lambda root: fake_library)

    with TestClient(main.app) as test_client:
        yield test_client

import importlib
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def make_client(tmp_path, monkeypatch):
    """Makes a TestClient backed by a stubbed library scan.

    main.py reads MUSIC_DIR and FRONTEND_DIR at import time and scans
    MUSIC_DIR in its lifespan, so the module is reloaded with MUSIC_DIR
    pointed at a tmp dir (and FRONTEND_DIR set or cleared), and
    scan_library is replaced with a fixed Library — the scan itself is
    covered separately by test_library.py.
    """

    def make(frontend_dir: Path | None = None) -> TestClient:
        monkeypatch.setenv("MUSIC_DIR", str(tmp_path))
        if frontend_dir is None:
            monkeypatch.delenv("FRONTEND_DIR", raising=False)
        else:
            monkeypatch.setenv("FRONTEND_DIR", str(frontend_dir))

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

        return TestClient(main.app)

    return make


@pytest.fixture
def client(make_client):
    """The backend as in dev: API only, no frontend build to serve."""
    with make_client() as test_client:
        yield test_client

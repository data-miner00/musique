from pathlib import Path

import library
from library import UNKNOWN_ALBUM, UNKNOWN_ARTIST, scan_library


class FakeAudioInfo:
    def __init__(self, length: float) -> None:
        self.length = length


class FakeMP3:
    """Stands in for mutagen.mp3.MP3: raises for files whose name contains
    'corrupt', otherwise reports a fixed duration."""

    def __init__(self, file_path: Path) -> None:
        if "corrupt" in file_path.name:
            raise ValueError("not a valid mp3")
        self.info = FakeAudioInfo(length=180.0)


def make_fake_easyid3(tags_by_filename: dict[str, dict[str, list[str]]]):
    class FakeEasyID3(dict):
        def __init__(self, file_path: Path) -> None:
            super().__init__(tags_by_filename.get(file_path.name, {}))

    return FakeEasyID3


def test_scan_library_orders_tracks_and_groups_by_top_level_folder(tmp_path, monkeypatch):
    monkeypatch.setattr(library, "MP3", FakeMP3)
    monkeypatch.setattr(
        library,
        "EasyID3",
        make_fake_easyid3(
            {
                "b.mp3": {"title": ["B Song"], "artist": ["Zed"], "album": ["Z Album"]},
                "a.mp3": {"title": ["A Song"], "artist": ["Ann"], "album": ["A Album"]},
                "root.mp3": {"title": ["Root Song"], "artist": ["Ann"], "album": ["A Album"]},
            }
        ),
    )

    (tmp_path / "Playlist One").mkdir()
    (tmp_path / "Playlist One" / "b.mp3").write_bytes(b"")
    (tmp_path / "Playlist One" / "a.mp3").write_bytes(b"")
    (tmp_path / "root.mp3").write_bytes(b"")

    lib = scan_library(tmp_path)

    assert [t.title for t in lib.tracks] == ["A Song", "Root Song", "B Song"]

    playlist_names = {p.name for p in lib.playlists}
    assert playlist_names == {"Playlist One", "Root"}

    root_playlist = next(p for p in lib.playlists if p.name == "Root")
    assert [lib.tracks_by_id[tid].title for tid in root_playlist.track_ids] == ["Root Song"]


def test_load_track_falls_back_to_filename_when_tags_missing(tmp_path, monkeypatch):
    monkeypatch.setattr(library, "MP3", FakeMP3)
    monkeypatch.setattr(library, "EasyID3", make_fake_easyid3({}))

    (tmp_path / "untagged song.mp3").write_bytes(b"")

    lib = scan_library(tmp_path)

    assert len(lib.tracks) == 1
    track = lib.tracks[0]
    assert track.title == "untagged song"
    assert track.artist == UNKNOWN_ARTIST
    assert track.album == UNKNOWN_ALBUM


def test_scan_library_skips_corrupt_and_non_mp3_files(tmp_path, monkeypatch):
    monkeypatch.setattr(library, "MP3", FakeMP3)
    monkeypatch.setattr(library, "EasyID3", make_fake_easyid3({}))

    (tmp_path / "corrupt.mp3").write_bytes(b"not really audio")
    (tmp_path / "notes.txt").write_bytes(b"not audio at all")
    (tmp_path / "good.mp3").write_bytes(b"")

    lib = scan_library(tmp_path)

    assert [t.title for t in lib.tracks] == ["good"]

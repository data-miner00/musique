def test_list_tracks_returns_scanned_tracks(client):
    response = client.get("/tracks")

    assert response.status_code == 200
    assert [t["title"] for t in response.json()] == ["Test Song"]


def test_list_playlists_returns_scanned_playlists(client):
    response = client.get("/playlists")

    assert response.status_code == 200
    assert response.json() == [{"id": "playlist-1", "name": "Root", "track_count": 1}]


def test_list_playlist_tracks_returns_tracks_for_known_playlist(client):
    response = client.get("/playlists/playlist-1/tracks")

    assert response.status_code == 200
    assert [t["title"] for t in response.json()] == ["Test Song"]


def test_list_playlist_tracks_404s_for_unknown_playlist(client):
    response = client.get("/playlists/does-not-exist/tracks")

    assert response.status_code == 404


def test_stream_track_returns_audio_bytes(client):
    response = client.get("/stream/track-1")

    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/mpeg"
    assert response.content == b"fake-audio-bytes"


def test_stream_track_404s_for_unknown_track(client):
    response = client.get("/stream/does-not-exist")

    assert response.status_code == 404

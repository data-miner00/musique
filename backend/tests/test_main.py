import pytest


def test_list_tracks_returns_scanned_tracks(client):
    response = client.get("/api/tracks")

    assert response.status_code == 200
    assert [t["title"] for t in response.json()] == ["Test Song"]


def test_list_playlists_returns_scanned_playlists(client):
    response = client.get("/api/playlists")

    assert response.status_code == 200
    assert response.json() == [{"id": "playlist-1", "name": "Root", "track_count": 1}]


def test_list_playlist_tracks_returns_tracks_for_known_playlist(client):
    response = client.get("/api/playlists/playlist-1/tracks")

    assert response.status_code == 200
    assert [t["title"] for t in response.json()] == ["Test Song"]


def test_list_playlist_tracks_404s_for_unknown_playlist(client):
    response = client.get("/api/playlists/does-not-exist/tracks")

    assert response.status_code == 404


def test_stream_track_returns_audio_bytes(client):
    response = client.get("/api/stream/track-1")

    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/mpeg"
    assert response.content == b"fake-audio-bytes"


def test_stream_track_serves_requested_byte_range(client):
    response = client.get("/api/stream/track-1", headers={"Range": "bytes=0-3"})

    assert response.status_code == 206
    assert response.headers["content-range"] == "bytes 0-3/16"
    assert response.content == b"fake"


def test_stream_track_404s_for_unknown_track(client):
    response = client.get("/api/stream/does-not-exist")

    assert response.status_code == 404


def test_health_check_answers_under_api(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_interactive_docs_are_served_under_api(client):
    docs = client.get("/api/docs")
    redoc = client.get("/api/redoc")
    schema = client.get("/api/openapi.json")

    assert docs.status_code == 200
    assert "text/html" in docs.headers["content-type"]
    assert redoc.status_code == 200
    assert schema.status_code == 200
    assert "/api/tracks" in schema.json()["paths"]


@pytest.mark.parametrize(
    "path",
    [
        "/",
        "/tracks",
        "/playlists",
        "/stream/track-1",
        "/health",
        "/docs",
        "/redoc",
        "/openapi.json",
    ],
)
def test_nothing_is_served_outside_api(client, path):
    response = client.get(path)

    assert response.status_code == 404


def test_cross_origin_requests_get_no_cors_headers(client):
    response = client.get("/api/tracks", headers={"Origin": "http://elsewhere.test"})

    assert response.status_code == 200
    assert not any(name.startswith("access-control-") for name in response.headers)

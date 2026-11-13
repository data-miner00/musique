import pytest

PAGE_HTML = "<!doctype html><html><body>Musique app shell</body></html>"
IMMUTABLE_ASSET = "_app/immutable/entry/app.abc123.js"
IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable"


@pytest.fixture
def frontend_build(tmp_path):
    """A stand-in for the frontend's static build output."""
    build = tmp_path / "frontend-build"
    (build / IMMUTABLE_ASSET).parent.mkdir(parents=True)
    (build / "index.html").write_text(PAGE_HTML)
    (build / IMMUTABLE_ASSET).write_text("console.log('app');")
    (build / "robots.txt").write_text("User-agent: *\n")
    return build


@pytest.fixture
def frontend_client(make_client, frontend_build):
    """The backend as in the container: FRONTEND_DIR points at a build."""
    with make_client(frontend_dir=frontend_build) as test_client:
        yield test_client


def test_page_is_served_at_root_when_frontend_dir_is_set(frontend_client):
    response = frontend_client.get("/")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert response.text == PAGE_HTML


def test_files_in_the_build_are_served(frontend_client):
    response = frontend_client.get("/robots.txt")

    assert response.status_code == 200
    assert response.text == "User-agent: *\n"


def test_api_still_answers_alongside_the_page(frontend_client):
    response = frontend_client.get("/api/tracks")

    assert response.status_code == 200
    assert [t["title"] for t in response.json()] == ["Test Song"]


def test_api_trailing_slash_still_redirects(frontend_client):
    response = frontend_client.get("/api/tracks/", follow_redirects=False)

    assert response.status_code == 307
    assert response.headers["location"].endswith("/api/tracks")


def test_unknown_paths_return_404_not_the_page(frontend_client):
    response = frontend_client.get("/nope", headers={"Accept": "text/html"})

    assert response.status_code == 404
    assert PAGE_HTML not in response.text


def test_hashed_assets_are_cached_for_good(frontend_client):
    first = frontend_client.get(f"/{IMMUTABLE_ASSET}")
    revalidated = frontend_client.get(
        f"/{IMMUTABLE_ASSET}", headers={"If-None-Match": first.headers["etag"]}
    )

    assert first.status_code == 200
    assert first.headers["cache-control"] == IMMUTABLE_CACHE_CONTROL
    assert revalidated.status_code == 304
    assert revalidated.headers["cache-control"] == IMMUTABLE_CACHE_CONTROL


@pytest.mark.parametrize("path", ["/", "/index.html"])
def test_the_page_is_always_revalidated(frontend_client, path):
    first = frontend_client.get(path)
    revalidated = frontend_client.get(path, headers={"If-None-Match": first.headers["etag"]})

    assert first.status_code == 200
    assert first.headers["cache-control"] == "no-cache"
    assert revalidated.status_code == 304
    assert revalidated.headers["cache-control"] == "no-cache"


def test_api_responses_get_no_cache_control(frontend_client):
    response = frontend_client.get("/api/tracks")

    assert "cache-control" not in response.headers


def test_streaming_still_serves_byte_ranges_alongside_the_page(frontend_client):
    response = frontend_client.get("/api/stream/track-1", headers={"Range": "bytes=0-3"})

    assert response.status_code == 206
    assert response.content == b"fake"

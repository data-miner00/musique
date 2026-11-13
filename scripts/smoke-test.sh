#!/usr/bin/env bash
# Smoke-tests a built Musique image over HTTP.
#
# Starts the image with a sample music folder mounted read-only, waits for
# the health check, then checks the page, the Library and a byte-range
# stream. Removes the container afterwards, pass or fail.
#
#   scripts/smoke-test.sh <image>      e.g. scripts/smoke-test.sh musique:ci
#
# Needs docker, curl and python3. The sample, smoke-test/Silence.mp3, is one
# second of silent MPEG-1 Layer III frames (32 kbps, 44.1 kHz, mono, no
# tags), so the Library lists it under its filename.
set -euo pipefail

image="${1:?usage: $0 <image>}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
container="musique-smoke-$$"
music_folder="$(mktemp -d)"
failures=0

cleanup() {
	docker rm -f "$container" >/dev/null 2>&1 || true
	rm -rf "$music_folder"
}
trap cleanup EXIT

pass() { echo "PASS  $1"; }
fail() {
	echo "FAIL  $1"
	failures=$((failures + 1))
}
show_logs_and_exit() {
	docker logs "$container" || true
	exit 1
}

# The container runs as its own user, so the sample must be world-readable.
cp "$script_dir/smoke-test/Silence.mp3" "$music_folder/"
chmod -R a+rX "$music_folder"

docker run --detach --name "$container" \
	--publish 127.0.0.1::8000 \
	--mount "type=bind,source=$music_folder,target=/music,readonly" \
	"$image" >/dev/null

# The published address disappears if the container stops, so look it up
# while waiting rather than once up front.
check="/api/health answers within 60 s"
address=""
healthy=false
for _ in $(seq 1 60); do
	address="$(docker port "$container" 8000/tcp 2>/dev/null | head -n 1 || true)"
	if [ -n "$address" ] &&
		curl --silent --fail --max-time 2 "http://$address/api/health" >/dev/null 2>&1; then
		healthy=true
		break
	fi
	if [ "$(docker inspect --format '{{.State.Running}}' "$container" 2>/dev/null || true)" != true ]; then
		fail "$check (the container stopped)"
		show_logs_and_exit
	fi
	sleep 1
done
if ! $healthy; then
	fail "$check"
	show_logs_and_exit
fi
pass "$check"
base="http://$address"

check="/ serves the page"
page_response="$(curl --silent --max-time 10 --output /dev/null \
	--write-out '%{http_code} %{content_type}' "$base/" || true)"
if [[ "$page_response" == "200 text/html"* ]]; then
	pass "$check"
else
	fail "$check (got: $page_response)"
fi

check="/api/tracks lists the sample track"
track_id="$(curl --silent --fail --max-time 10 "$base/api/tracks" | python3 -c '
import json, sys
tracks = json.load(sys.stdin)
print(next((t["id"] for t in tracks if t["title"] == "Silence"), ""))
' || true)"
if [ -n "$track_id" ]; then
	pass "$check"
else
	fail "$check"
fi

check="a Range request on the stream answers 206"
if [ -z "$track_id" ]; then
	fail "$check (no track to stream)"
else
	range_status="$(curl --silent --max-time 10 --output /dev/null --write-out '%{http_code}' \
		--header 'Range: bytes=0-99' "$base/api/stream/$track_id" || true)"
	if [ "$range_status" = 206 ]; then
		pass "$check"
	else
		fail "$check (got: $range_status)"
	fi
fi

if [ "$failures" -gt 0 ]; then
	show_logs_and_exit
fi

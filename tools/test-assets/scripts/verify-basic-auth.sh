#!/usr/bin/env bash
# Verify the Basic Auth fixtures on the test-assets server: the gated feed, the feed variants,
# the public media mirror, the cross-host redirect, and the Authorization probe.
# Run from monorepo root. Server must already be running (e.g. npm run start -w podverse-test-assets).
# The other-host checks need the server on IPv4 too (BIND_ADDRESS=0.0.0.0 when localhost is ::1 only).
set -e

BASE_URL="${BASE_URL:-http://localhost:2111}"
USERNAME="username"
PASSWORD="password"

# The other loopback host: localhost <-> 127.0.0.1. Credentials are scoped by exact host for these.
if [[ "${BASE_URL}" == *"127.0.0.1"* ]]; then
  OTHER_BASE_URL="${BASE_URL/127.0.0.1/localhost}"
else
  OTHER_BASE_URL="${BASE_URL/localhost/127.0.0.1}"
fi

FEED_URL="${BASE_URL}/basic-auth/feeds/feed-basic-auth.rss"
PUBLIC_MEDIA_FEED_URL="${BASE_URL}/basic-auth/variants/feed-public-media.rss"
OTHER_HOST_FEED_URL="${BASE_URL}/basic-auth/variants/feed-other-host-media.rss"

fail() {
  echo "FAIL: $1"
  exit 1
}

# expect_status <expected> <label> <curl args...>
expect_status() {
  local expected="$1"
  local label="$2"
  shift 2
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" "$@" || true)
  if [ "${status}" = "000" ]; then
    fail "${label}: no connection (is the server listening on that host? try BIND_ADDRESS=0.0.0.0)"
  fi
  if [ "${status}" != "${expected}" ]; then
    fail "${label}: expected ${expected}, got ${status}"
  fi
  echo "  OK: ${label} -> ${status}"
}

# expect_body_contains <needle> <label> <curl args...>
expect_body_contains() {
  local needle="$1"
  local label="$2"
  shift 2
  if ! curl -s "$@" | grep -q -- "${needle}"; then
    fail "${label}: body does not contain ${needle}"
  fi
  echo "  OK: ${label} contains ${needle}"
}

echo "Base feed (feed and media gated): ${FEED_URL}"
NOAUTH_HEADERS=$(curl -s -i "${FEED_URL}" 2>/dev/null | head -n 20)
if ! echo "${NOAUTH_HEADERS}" | grep -q "401 Unauthorized"; then
  fail "without auth expected 401 Unauthorized, got: $(echo "${NOAUTH_HEADERS}" | head -n 1)"
fi
if ! echo "${NOAUTH_HEADERS}" | grep -q "WWW-Authenticate: Basic"; then
  fail "without auth expected WWW-Authenticate: Basic header"
fi
echo "  OK: without auth -> 401 with WWW-Authenticate"
expect_status 200 "with auth" -u "${USERNAME}:${PASSWORD}" "${FEED_URL}"
expect_status 401 "media without auth" "${BASE_URL}/basic-auth/audio/audio-001.mp3"

echo "Feed gated, media public: ${PUBLIC_MEDIA_FEED_URL}"
expect_status 401 "feed without auth" "${PUBLIC_MEDIA_FEED_URL}"
expect_status 200 "feed with auth" -u "${USERNAME}:${PASSWORD}" "${PUBLIC_MEDIA_FEED_URL}"
expect_body_contains "/basic-auth-public-media/audio/" "feed enclosures" \
  -u "${USERNAME}:${PASSWORD}" "${PUBLIC_MEDIA_FEED_URL}"
expect_status 200 "public media without auth" \
  "${BASE_URL}/basic-auth-public-media/audio/audio-001.mp3"
expect_status 404 "public mirror never serves feeds" \
  "${BASE_URL}/basic-auth-public-media/feeds/feed-basic-auth.rss"

echo "Feed gated, media on the other host: ${OTHER_HOST_FEED_URL}"
expect_status 200 "feed with auth" -u "${USERNAME}:${PASSWORD}" "${OTHER_HOST_FEED_URL}"
expect_body_contains "http://127.0.0.1:2111/basic-auth/audio/" "feed enclosures" \
  -u "${USERNAME}:${PASSWORD}" "${OTHER_HOST_FEED_URL}"
expect_status 401 "other-host media without auth" \
  "${OTHER_BASE_URL}/basic-auth/audio/audio-001.mp3"

echo "Redirect to the other host"
REDIRECT_URL="${BASE_URL}/redirect/other-host/basic-auth/feeds/feed-basic-auth.rss"
expect_status 302 "redirect" "${REDIRECT_URL}"
LOCATION=$(curl -s -o /dev/null -w "%{redirect_url}" "${REDIRECT_URL}")
if [ "${LOCATION}" != "${OTHER_BASE_URL}/basic-auth/feeds/feed-basic-auth.rss" ]; then
  fail "redirect Location expected ${OTHER_BASE_URL}/basic-auth/feeds/feed-basic-auth.rss, got ${LOCATION}"
fi
echo "  OK: Location -> ${LOCATION}"
# curl, like the parser, drops credentials when a redirect changes host.
expect_status 401 "followed redirect with auth (credentials dropped)" \
  -L -u "${USERNAME}:${PASSWORD}" "${REDIRECT_URL}"

echo "Authorization probe"
expect_body_contains '"authorization":"present"' "probe with auth" \
  -u "${USERNAME}:${PASSWORD}" "${BASE_URL}/debug/authorization"
expect_body_contains '"authorization":"absent"' "probe after cross-host redirect" \
  -L -u "${USERNAME}:${PASSWORD}" "${BASE_URL}/redirect/other-host/debug/authorization"

echo "Basic Auth verification passed."

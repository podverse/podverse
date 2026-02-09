#!/usr/bin/env bash
# Verify Basic Auth on the test-assets server (expect 401 without auth, 200 with auth).
# Run from monorepo root. Server must already be running (e.g. npm run start -w podverse-test-assets).
set -e

BASE_URL="${BASE_URL:-http://localhost:2111}"
FEED_URL="${BASE_URL}/basic-auth/feeds/feed-basic-auth.rss"

echo "Verifying Basic Auth at ${FEED_URL}"

# Without auth: expect 401 and WWW-Authenticate
NOAUTH_HEADERS=$(curl -s -i "${FEED_URL}" 2>/dev/null | head -n 20)
if ! echo "${NOAUTH_HEADERS}" | grep -q "401 Unauthorized"; then
  echo "FAIL: without auth expected 401 Unauthorized, got: $(echo "${NOAUTH_HEADERS}" | head -n 1)"
  exit 1
fi
if ! echo "${NOAUTH_HEADERS}" | grep -q "WWW-Authenticate: Basic"; then
  echo "FAIL: without auth expected WWW-Authenticate: Basic header"
  exit 1
fi
echo "  OK: without auth -> 401 with WWW-Authenticate"

# With auth: expect 200
AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -u username:password "${FEED_URL}")
if [ "${AUTH_STATUS}" != "200" ]; then
  echo "FAIL: with auth expected 200, got ${AUTH_STATUS}"
  exit 1
fi
echo "  OK: with auth -> 200"

echo "Basic Auth verification passed."

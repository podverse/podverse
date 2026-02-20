#!/bin/sh
# Local Docker only: proxy localhost:2111 to test-assets container so SSR (e.g. /api/proxy)
# can fetch http://localhost:2111/... (parity with web).
socat TCP-LISTEN:2111,fork,bind=127.0.0.1 TCP:podverse_local_test_assets:2111 &
sleep 1
if [ $# -eq 0 ]; then
  set -- node apps/management-web/server.js
fi
exec "$@"

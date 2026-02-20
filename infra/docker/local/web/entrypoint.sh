#!/bin/sh
# Local Docker only: proxy localhost:2111 to test-assets container so SSR (e.g. /api/proxy,
# Next.js image optimization) can fetch http://localhost:2111/... (images, etc.).
socat TCP-LISTEN:2111,fork,bind=127.0.0.1 TCP:podverse_local_test_assets:2111 &
sleep 1
if [ $# -eq 0 ]; then
  set -- node apps/web/server.js
fi
exec "$@"

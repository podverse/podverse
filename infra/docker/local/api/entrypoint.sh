#!/bin/sh
# Local Docker only: proxy localhost:2111 to test-assets container so transcript/chapters
# at http://localhost:2111/... work (e.g. item transcript, add-by-RSS chapters).
socat TCP-LISTEN:2111,fork,bind=127.0.0.1 TCP:podverse_local_test_assets:2111 &
sleep 1
if [ $# -eq 0 ]; then
  set -- node apps/api/dist/index.js
fi
exec "$@"

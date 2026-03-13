#!/bin/sh
# Local Docker only: proxy localhost:2111 to test-assets container so feeds/images/video
# at http://localhost:2111/... work without app-level URL rewriting.
socat TCP-LISTEN:2111,fork,bind=127.0.0.1 TCP:podverse_local_test_assets:2111 &
sleep 1
exec "$@"

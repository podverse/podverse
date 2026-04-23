#!/usr/bin/env bash
# Deprecated: use getLatestStagingTag.sh. Kept for existing server paths; delegates to the same implementation.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/getLatestStagingTag.sh" "$@"

#!/usr/bin/env bash
# Open the iOS simulator host UI.
# Xcode 27+ ships DeviceHub.app; earlier Xcode ships Simulator.app.
# Usage: bash scripts/mobile/open-simulator-ui.sh

set -euo pipefail

DEVICEHUB_APP="${DEVICEHUB_APP:-/Applications/Xcode.app/Contents/Applications/DeviceHub.app}"

if [[ -d "$DEVICEHUB_APP" ]]; then
  open "$DEVICEHUB_APP" >/dev/null 2>&1 || true
  exit 0
fi

open -a Simulator >/dev/null 2>&1 || true

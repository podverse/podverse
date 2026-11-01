#!/usr/bin/env bash
# Drop the redundant `as any Error` cast in expo-modules-core's AsyncFunctionDefinition.build.
# Apple Swift 6.4.2 (Xcode 27.2) crashes in SILGen on
# `switch consume result` / `case .failure(let error as any Error):` when ExpoModulesCore is
# compiled from source (usePrecompiledModules: false). Exception already conforms to Error, so the
# cast is unused. Upstream: expo/expo#52231, fix PR expo/expo#52631. Remove this script once the
# installed expo-modules-core no longer contains that pattern.
# Idempotent: safe after every mobile npm install / before expo run:ios / before pod install / EAS.
# Usage: bash scripts/mobile/ensure-expo-modules-core-swift.sh [mobile_dir]
# Default mobile_dir: <repo_root>/apps/mobile

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MOBILE_DIR="${1:-$REPO_ROOT/apps/mobile}"
TARGET="$MOBILE_DIR/node_modules/expo-modules-core/ios/Core/Functions/AsyncFunctionDefinition.swift"

if [[ ! -f "$TARGET" ]]; then
  exit 0
fi

python3 - "$TARGET" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()
old = 'case .failure(let error as any Error):'
new = 'case .failure(let error):'
if old not in text:
    raise SystemExit(0)
path.write_text(text.replace(old, new, 1))
print(f'Patched Swift 6.4.2 ExpoModulesCore SILGen crash: {path}')
PY

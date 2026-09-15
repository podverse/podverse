#!/usr/bin/env bash
# Restore expo-sqlite's vendored SQLite amalgamation into its ios/ directory.
# ExpoSQLite.podspec copies vendor/{sqlite3,sqlcipher}/sqlite3.{c,h} into expo-sqlite/ios/ while
# CocoaPods evaluates the podspec, because CocoaPods cannot reference source_files outside the pod
# directory. Those copies live in node_modules, so any mobile npm install removes them while the
# generated Pods project still lists ios/sqlite3.c as a build input, and xcodebuild fails with
# "Build input file cannot be found". No script phase regenerates them, so restore them here.
# Idempotent: safe after every mobile npm install / before expo run:ios / before pod install.
# Usage: bash scripts/mobile/ensure-expo-sqlite-vendored-sources.sh [mobile_dir]
# Default mobile_dir: <repo_root>/apps/mobile

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MOBILE_DIR="${1:-$REPO_ROOT/apps/mobile}"
SQLITE_DIR="$MOBILE_DIR/node_modules/expo-sqlite"
PODFILE_PROPERTIES="$MOBILE_DIR/ios/Podfile.properties.json"

if [[ ! -d "$SQLITE_DIR/ios" ]]; then
  exit 0
fi

# The podspec picks the vendor directory from expo.sqlite.useSQLCipher; mirror that choice so the
# restored sources match what pod install would have copied.
VENDOR="sqlite3"
if [[ -f "$PODFILE_PROPERTIES" ]] && grep -q '"expo\.sqlite\.useSQLCipher"[[:space:]]*:[[:space:]]*"true"' "$PODFILE_PROPERTIES"; then
  VENDOR="sqlcipher"
fi

RESTORED=0
for file in sqlite3.c sqlite3.h; do
  source_file="$SQLITE_DIR/vendor/$VENDOR/$file"
  destination="$SQLITE_DIR/ios/$file"

  if [[ -f "$destination" ]]; then
    continue
  fi
  if [[ ! -f "$source_file" ]]; then
    echo "Warning: $source_file not found; cannot restore $destination." >&2
    continue
  fi

  cp "$source_file" "$destination"
  RESTORED=1
done

if [[ "$RESTORED" -eq 1 ]]; then
  echo "Restored expo-sqlite vendored $VENDOR sources: $SQLITE_DIR/ios/sqlite3.{c,h}"
fi

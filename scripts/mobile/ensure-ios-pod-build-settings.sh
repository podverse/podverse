#!/usr/bin/env bash
# Apply the Xcode 27 pod build settings to a generated iOS project: refresh the post_install hook in
# the Podfile, and patch an already-installed Pods project so the next xcodebuild does not wait on a
# re-prebuild. Rationale for each setting: apps/mobile/plugins/ios-pod-build-settings.rb
# Usage: bash scripts/mobile/ensure-ios-pod-build-settings.sh [ios_dir]
# Default ios_dir: <repo_root>/apps/mobile/ios

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
IOS_DIR="${1:-$REPO_ROOT/apps/mobile/ios}"
PODFILE="$IOS_DIR/Podfile"
SNIPPET="$REPO_ROOT/apps/mobile/plugins/ios-pod-build-settings.rb"

if [[ ! -f "$PODFILE" || ! -f "$SNIPPET" ]]; then
  exit 0
fi

python3 - "$PODFILE" "$SNIPPET" <<'PY'
from pathlib import Path
import re
import sys

podfile_path = Path(sys.argv[1])
snippet = Path(sys.argv[2]).read_text().rstrip() + '\n'
text = podfile_path.read_text()

# Replace rather than skip, so an edited snippet reaches a Podfile that already carries one.
generated_block = re.compile(
    r'[ \t]*# @generated begin podverse-ios-[\w-]+.*?# @generated end podverse-ios-[\w-]+\n?',
    re.DOTALL,
)
stripped = generated_block.sub('', text)
anchor = (
    "          config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'\n"
    '        end\n'
    '      end\n'
    '    end\n'
)
if anchor not in stripped:
    raise SystemExit(f'Error: {podfile_path} is missing the Expo resource-bundle post_install loop')
next_text = stripped.replace(anchor, f'{anchor}\n    {snippet}\n', 1)
if next_text != text:
    podfile_path.write_text(next_text)
    print(f'Applied iOS pod build settings hook to {podfile_path}')
PY

if [[ -d "$IOS_DIR/Pods" ]]; then
  python3 - "$IOS_DIR/Pods" <<'PY'
from pathlib import Path
import re
import sys

root = Path(sys.argv[1])
deployment_target = re.compile(r'(IPHONEOS_DEPLOYMENT_TARGET\s*=\s*)(\d+(?:\.\d+)?)')
explicit_modules = re.compile(r'^SWIFT_ENABLE_EXPLICIT_MODULES\s*=.*$', re.MULTILINE)


def clamp(match):
    if float(match.group(2)) < 15.0:
        return f'{match.group(1)}15.0'
    return match.group(0)


clamped = 0
for path in list(root.rglob('*.xcconfig')) + list(root.rglob('project.pbxproj')):
    text = path.read_text()
    next_text, count = deployment_target.subn(clamp, text)
    if count and next_text != text:
        path.write_text(next_text)
        clamped += 1
if clamped:
    print(f'Clamped IPHONEOS_DEPLOYMENT_TARGET in {clamped} files under {root}')

# Pod xcconfigs only: Pods-<app>.xcconfig is the app target's base config, and the app target has no
# header shadowing the SDK, so it keeps Xcode's faster explicit modules.
opted_out = 0
for path in root.rglob('*.xcconfig'):
    if path.name.startswith('Pods-'):
        continue
    text = path.read_text()
    setting = 'SWIFT_ENABLE_EXPLICIT_MODULES = NO'
    if explicit_modules.search(text):
        next_text = explicit_modules.sub(setting, text)
    else:
        next_text = text if text.endswith('\n') else f'{text}\n'
        next_text = f'{next_text}{setting}\n'
    if next_text != text:
        path.write_text(next_text)
        opted_out += 1
if opted_out:
    print(f'Set SWIFT_ENABLE_EXPLICIT_MODULES=NO in {opted_out} pod xcconfigs under {root}')
PY
fi

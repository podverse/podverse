#!/usr/bin/env bash
# Teach Expo SDK 52's CLI about Xcode 27:
#   - the simulator UI is DeviceHub.app (com.apple.dt.Devices), not Simulator.app
#   - `devicectl list devices` reports simulators, which must install/launch through simctl
#   - devicectl's JSON payload is version 5; the shape the CLI reads is unchanged
# Idempotent: safe after every mobile npm install / before expo run:ios.
# Usage: bash scripts/mobile/patch-expo-cli-xcode27.sh [mobile_dir]
# Default mobile_dir: <repo_root>/apps/mobile

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MOBILE_DIR="${1:-$REPO_ROOT/apps/mobile}"
CLI_DIR="$MOBILE_DIR/node_modules/@expo/cli/build/src/start"

PREREQ="$CLI_DIR/doctor/apple/SimulatorAppPrerequisite.js"
ENSURE="$CLI_DIR/platforms/ios/ensureSimulatorAppRunning.js"
MANAGER="$CLI_DIR/platforms/ios/AppleDeviceManager.js"
DEVICECTL="$CLI_DIR/platforms/ios/devicectl.js"

if [[ ! -f "$PREREQ" || ! -f "$ENSURE" || ! -f "$MANAGER" || ! -f "$DEVICECTL" ]]; then
  exit 0
fi

is_patched() {
  grep -q 'com.apple.dt.Devices' "$PREREQ" &&
    grep -q 'DeviceHub' "$ENSURE" &&
    grep -q 'DeviceHub' "$MANAGER" &&
    grep -q 'visibilityClass' "$DEVICECTL"
}

# bash 3.2 (macOS native, and what run-expo-macos.sh leaves on PATH) cannot parse a here-document
# inside a command substitution, so changes are reported through a flag file.
CHANGE_FLAG="$(mktemp "${TMPDIR:-/tmp}/expo-cli-xcode27.XXXXXX")"
trap 'rm -f "$CHANGE_FLAG"' EXIT

python3 - "$PREREQ" "$ENSURE" "$MANAGER" "$DEVICECTL" "$CHANGE_FLAG" <<'PY'
from pathlib import Path
import sys

prereq_path, ensure_path, manager_path, devicectl_path, change_flag = (
    Path(p) for p in sys.argv[1:]
)


def replace_once(path: Path, old: str, new: str) -> None:
    replace_any(path, [old], new)


def replace_any(path: Path, olds: list[str], new: str) -> None:
    """Apply `new`, accepting any of `olds` as the text it supersedes."""
    text = path.read_text()
    if new in text:
        return
    for old in olds:
        if old in text:
            path.write_text(text.replace(old, new, 1))
            with change_flag.open('a') as flag:
                flag.write(f'{path}\n')
            return
    raise SystemExit(f'Error: expected text missing in {path}')


replace_once(
    prereq_path,
    '''async function getSimulatorAppIdAsync() {
    try {
        return (await (0, _osascript().execAsync)('id of app "Simulator"')).trim();
    } catch  {
    // This error may occur in CI where the users intends to install just the simulators but no Xcode.
    }
    return null;
}''',
    '''async function getAppIdByNameAsync(name) {
    try {
        return (await (0, _osascript().execAsync)(`id of app "${name}"`)).trim();
    } catch  {
    }
    return null;
}
async function getXcodeSelectPathAsync() {
    try {
        const result = await (0, _spawnAsync().default)("xcode-select", [
            "--print-path"
        ]);
        return result.stdout.trim() || null;
    } catch  {
        return null;
    }
}
async function getBundleIdFromPlistAsync(infoPlistPath) {
    try {
        const result = await (0, _spawnAsync().default)("defaults", [
            "read",
            infoPlistPath,
            "CFBundleIdentifier"
        ]);
        return result.stdout.trim() || null;
    } catch  {
        return null;
    }
}
async function getSimulatorAppIdAsync() {
    let appId = await getAppIdByNameAsync("Simulator") || await getAppIdByNameAsync("DeviceHub");
    if (!appId) {
        const xcodePath = await getXcodeSelectPathAsync();
        if (xcodePath) {
            const path = require("path");
            appId = await getBundleIdFromPlistAsync(path.join(xcodePath, "Applications/Simulator.app/Contents/Info.plist")) || await getBundleIdFromPlistAsync(path.join(xcodePath, "../Applications/DeviceHub.app/Contents/Info.plist"));
        }
    }
    return appId;
}''',
)

replace_once(
    prereq_path,
    'throw new _prerequisite.PrerequisiteCommandError("SIMULATOR_APP", "Can\'t determine id of Simulator app; the Simulator is most likely not installed on this machine. Run `sudo xcode-select -s /Applications/Xcode.app`");',
    'throw new _prerequisite.PrerequisiteCommandError("SIMULATOR_APP", "Can\'t determine id of Device Hub or Simulator app; the Device Hub or Simulator is most likely not installed on this machine. Run `sudo xcode-select -s /Applications/Xcode.app`");',
)

replace_once(
    prereq_path,
    '        if (result !== "com.apple.iphonesimulator" && result !== "com.apple.CoreSimulator.SimulatorTrampoline") {\n            throw new _prerequisite.PrerequisiteCommandError("SIMULATOR_APP", "Simulator is installed but is identified as \'" + result + "\'; don\'t know what that is.");\n        }',
    '        if (result !== "com.apple.dt.Devices" && result !== "com.apple.iphonesimulator" && result !== "com.apple.CoreSimulator.SimulatorTrampoline") {\n            throw new _prerequisite.PrerequisiteCommandError("SIMULATOR_APP", "Device Hub or Simulator is installed but is identified as \'" + result + "\'; don\'t know what that is.");\n        }',
)

replace_once(
    ensure_path,
    """        const zeroMeansNo = (await _osascript().execAsync('tell app "System Events" to count processes whose name is "Simulator"')).trim();""",
    """        const zeroMeansNo = (await _osascript().execAsync('tell app "System Events" to count processes whose name is "Simulator" or name is "DeviceHub"')).trim();""",
)

replace_once(
    ensure_path,
    '''async function openSimulatorAppAsync(device) {
    const args = [
        "-a",
        "Simulator"
    ];
    if (device.udid) {
        // This has no effect if the app is already running.
        args.push("--args", "-CurrentDeviceUDID", device.udid);
    }
    await (0, _spawnAsync().default)("open", args);
}''',
    '''async function openSimulatorAppAsync(device) {
    try {
        const args = [
            "-a",
            "Simulator"
        ];
        if (device.udid) {
            args.push("--args", "-CurrentDeviceUDID", device.udid);
        }
        await (0, _spawnAsync().default)("open", args);
    } catch  {
        const deviceHubArgs = device.udid ? [
            `devices://device/open?id=${device.udid}`
        ] : [
            "-a",
            "DeviceHub"
        ];
        await (0, _spawnAsync().default)("open", deviceHubArgs).catch(()=>{});
    }
}''',
)

replace_any(
    manager_path,
    [
        '        await _osascript().execAsync(`tell application "Simulator" to activate`);',
        '        await _osascript().execAsync(\'if application "Simulator" is running then tell application "Simulator" to activate else if application "DeviceHub" is running then tell application "DeviceHub" to activate end if\');',
    ],
    '''        try {
            await _osascript().execAsync('tell application "Simulator" to activate');
        } catch  {
            // Xcode 27 ships DeviceHub.app instead of Simulator.app.
            await _osascript().execAsync('tell application "DeviceHub" to activate').catch(()=>{});
        }''',
)

# Simulators reported by devicectl would be treated as physical hardware (deviceType "device"), so
# `expo run:ios --device <simulator>` would install over devicectl and fail with `Error: null`.
replace_once(
    devicectl_path,
    '    assertDevicesJson(devicesJson);\n    return devicesJson.result.devices;',
    '    assertDevicesJson(devicesJson);\n    return devicesJson.result.devices.filter((device)=>device.visibilityClass !== "simulators" && (device.hardwareProperties == null ? true : device.hardwareProperties.reality !== "simulated"));',
)

# devicectl reports jsonVersion 5; the fields this CLI reads are unchanged, so only older is suspect.
replace_once(
    devicectl_path,
    'ref1.jsonVersion) !== 2) {',
    'ref1.jsonVersion) < 2) {',
)
PY

if ! is_patched; then
  echo "Error: failed to patch Expo CLI for Xcode 27: $CLI_DIR" >&2
  exit 1
fi

if [[ -s "$CHANGE_FLAG" ]]; then
  echo "Patched Expo CLI for Xcode 27: $CLI_DIR"
fi

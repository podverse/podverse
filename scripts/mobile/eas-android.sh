#!/usr/bin/env bash
# EAS cloud builds for Android (the .aab uploaded to a Play Console testing track).
#
# Usage (from monorepo root):
#   make mobile_eas_android_build                  # build beta .aab, wait, download it
#   make mobile_eas_android_download               # download the latest finished beta build
#   make mobile_eas_android_download BUILD_ID=<id> # download one specific build
#   make mobile_eas_android_submit                 # upload the latest beta build as a Play draft
#   make mobile_eas_android_submit ROLLOUT=1       # upload and roll out to its testing track
#   make mobile_eas_android_list                   # recent Android builds
#   make mobile_eas_android_version                # remote versionCode EAS builds from
#   bash scripts/mobile/eas-android.sh <build|download|submit|list|version> \
#     [--profile beta] [--build-id <id>] [--rollout]
#
# Profiles come from apps/mobile/eas.json. `beta` and `production` produce a Play .aab; `internal`
# produces a dev-client .apk. The versionCode is stored remotely and auto-increments per build, so
# Play always receives a higher code than the last upload.
#
# Nothing reaches testers without a typed confirmation. `submit` uses the eas.json submit profile
# named after --profile (`beta`), which leaves a draft release that someone rolls out in Play
# Console. `--rollout` switches to `<profile>-rollout`, which publishes to the track and must be
# confirmed by typing the build's versionCode. A submit profile must set `track` and
# `releaseStatus` explicitly; the eas-cli default is a completed rollout. `build` and `submit`
# refuse to run without an interactive terminal, so neither can run unattended.
#
# The Google service account key is the one stored on EAS; on first submit eas-cli asks for its
# JSON path and offers to store it. That service account needs the Play Console permission
# "Release apps to testing tracks" and nothing broader.
#
# EAS uploads the working tree, uncommitted changes included, but records only the HEAD commit
# hash. Two builds can show the same commit with different code; tell them apart by versionCode
# and SDK version (`list`).
#
# Downloads land in .artifacts/mobile-builds/ (gitignored).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MOBILE_DIR="$REPO_ROOT/apps/mobile"
OUTPUT_DIR="$REPO_ROOT/.artifacts/mobile-builds"
EAS_CLI_VERSION="${EAS_CLI_VERSION:-latest}"

COMMAND="${1:-}"
[[ $# -gt 0 ]] && shift
PROFILE='beta'
BUILD_ID=''
ROLLOUT=0

usage() {
  awk 'NR == 1 { next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "$0"
}

die() {
  echo "Error: $*" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile)
      [[ $# -ge 2 && -n "$2" ]] || die '--profile needs a value (beta, production, internal)'
      PROFILE="$2"
      shift
      ;;
    --build-id)
      [[ $# -ge 2 ]] || die '--build-id needs a value'
      BUILD_ID="$2"
      shift
      ;;
    --rollout) ROLLOUT=1 ;;
    -h | --help)
      usage
      exit 0
      ;;
    *) die "unknown flag: $1 (supported: --profile, --build-id, --rollout)" ;;
  esac
  shift
done

# eas-cli has no --cwd; it reads eas.json and app.config.ts from the current directory.
eas() {
  (cd "$MOBILE_DIR" && npx --yes "eas-cli@${EAS_CLI_VERSION}" "$@")
}

require_terminal() {
  [[ -t 0 ]] || die "$1 needs an interactive terminal to confirm; it never runs unattended."
}

confirm_yes() {
  local answer=''
  read -r -p "$1 [y/N] " answer || true
  [[ "$answer" == 'y' || "$answer" == 'Y' ]] || die 'Cancelled.'
}

confirm_typed() {
  local expected="$1" prompt="$2" answer=''
  read -r -p "$prompt " answer || true
  [[ "$answer" == "$expected" ]] || die "Cancelled (expected '$expected')."
}

print_version() {
  echo "Remote Android versionCode for profile '$PROFILE' (the next build uses this + 1):"
  eas build:version:get --platform android --profile "$PROFILE"
}

warn_dirty_tree() {
  local changed
  changed="$(git -C "$REPO_ROOT" status --porcelain | wc -l | tr -d ' ')"
  if [[ "$changed" -gt 0 ]]; then
    echo "Note: $changed uncommitted path(s) will be included in this build; EAS records HEAD" \
      "($(git -C "$REPO_ROOT" rev-parse --short HEAD)) as its commit."
  fi
}

# Prints "<track>\t<releaseStatus>" for an eas.json submit profile, or fails when the profile is
# missing or leaves either field to the eas-cli default.
read_submit_profile() {
  node -e '
    const fs = require("fs");
    const [file, name] = process.argv.slice(1);
    const android = JSON.parse(fs.readFileSync(file, "utf8")).submit?.[name]?.android;
    if (!android) {
      console.error(`eas.json has no submit profile "${name}" with an android section.`);
      process.exit(1);
    }
    if (!android.track || !android.releaseStatus) {
      console.error(`Submit profile "${name}" must set android.track and android.releaseStatus.`);
      process.exit(1);
    }
    process.stdout.write(`${android.track}\t${android.releaseStatus}\n`);
  ' "$MOBILE_DIR/eas.json" "$1"
}

# Prints "<id>\t<url>\t<file name>\t<versionCode>\t<summary>" for one finished build: --build-id,
# else the newest finished build for the profile.
resolve_build() {
  local json
  if [[ -n "$BUILD_ID" ]]; then
    json="$(eas build:view "$BUILD_ID" --json)"
  else
    json="$(eas build:list --platform android --status finished --build-profile "$PROFILE" \
      --limit 1 --json)"
  fi
  printf '%s' "$json" | node -e '
    let input = "";
    process.stdin.on("data", (chunk) => (input += chunk));
    process.stdin.on("end", () => {
      const parsed = JSON.parse(input);
      const build = Array.isArray(parsed) ? parsed[0] : parsed;
      if (!build) {
        console.error(`No finished Android build found for profile "${process.argv[1]}".`);
        process.exit(1);
      }
      const url = build.artifacts?.buildUrl;
      if (build.status !== "FINISHED" || !url) {
        console.error(`Build ${build.id} has status ${build.status} and no downloadable artifact.`);
        process.exit(1);
      }
      const extension = url.split(".").pop();
      const name = `podverse-next-${build.appVersion}-${build.appBuildVersion}-${build.buildProfile}.${extension}`;
      const summary = [
        `build ${build.id}`,
        `versionCode ${build.appBuildVersion}`,
        `version ${build.appVersion}`,
        `SDK ${build.sdkVersion}`,
        `commit ${String(build.gitCommitHash).slice(0, 9)}`,
        `finished ${build.completedAt}`,
      ].join(", ");
      process.stdout.write(`${build.id}\t${url}\t${name}\t${build.appBuildVersion}\t${summary}\n`);
    });
  ' "$PROFILE"
}

download() {
  local resolved id url name version_code summary target
  resolved="$(resolve_build)"
  IFS=$'\t' read -r id url name version_code summary <<<"$resolved"
  mkdir -p "$OUTPUT_DIR"
  target="$OUTPUT_DIR/$name"
  echo "Downloading $summary"
  curl -fL --progress-bar -o "$target" "$url"
  echo
  echo "Saved: $target"
  if [[ "$target" == *.aab ]]; then
    echo "Upload it in Play Console: Test and release -> Testing -> Internal testing ->" \
      "Create new release -> App bundles."
  fi
}

build() {
  require_terminal 'build'
  print_version
  warn_dirty_tree
  confirm_yes "Start an EAS Android cloud build with profile '$PROFILE'? It uses the next versionCode."
  echo "Reuse the existing keystore if eas-cli asks; a new one would not match Play's upload key."
  eas build --platform android --profile "$PROFILE"
  download
}

submit() {
  local submit_profile profile_fields track release_status
  local resolved id url name version_code summary
  require_terminal 'submit'
  submit_profile="$PROFILE"
  [[ "$ROLLOUT" -eq 1 ]] && submit_profile="${PROFILE}-rollout"
  profile_fields="$(read_submit_profile "$submit_profile")"
  IFS=$'\t' read -r track release_status <<<"$profile_fields"
  if [[ "$ROLLOUT" -eq 0 && "$release_status" != 'draft' ]]; then
    die "Submit profile '$submit_profile' has releaseStatus '$release_status'; without --rollout" \
      "it must be 'draft'."
  fi

  resolved="$(resolve_build)"
  IFS=$'\t' read -r id url name version_code summary <<<"$resolved"
  echo
  echo "Build:          $summary"
  echo "Play track:     $track"
  echo "Release status: $release_status (submit profile '$submit_profile' in apps/mobile/eas.json)"
  echo
  if [[ "$ROLLOUT" -eq 1 ]]; then
    echo "This publishes versionCode $version_code to everyone on the '$track' track."
    confirm_typed "$version_code" "Type the versionCode ($version_code) to roll it out:"
  else
    echo "This uploads a draft release. Testers get nothing until it is rolled out in Play Console."
    confirm_yes "Upload versionCode $version_code to Play as a draft?"
  fi

  if ! eas submit --platform android --profile "$submit_profile" --id "$id" --wait; then
    echo >&2
    echo "Submit failed. 'Only releases with status draft may be created on draft app' means" \
      "no release has been rolled out yet: submit without ROLLOUT=1, then roll the draft out" \
      "in Play Console. A permission error means the service account lacks release access in" \
      "Play Console -> Users and permissions." >&2
    exit 1
  fi
  if [[ "$ROLLOUT" -eq 1 ]]; then
    echo "Rolled out versionCode $version_code to the '$track' track."
  else
    echo "Draft created. Roll it out in Play Console: Test and release -> Testing ->" \
      "Internal testing -> Edit release -> Next -> Save and publish."
  fi
}

case "$COMMAND" in
  build) build ;;
  download) download ;;
  submit) submit ;;
  list) eas build:list --platform android --limit 10 ;;
  version) print_version ;;
  '' | -h | --help) usage ;;
  *)
    usage >&2
    die "unknown command: $COMMAND (supported: build, download, submit, list, version)"
    ;;
esac

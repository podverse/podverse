#!/usr/bin/env bash
# EAS cloud builds and store submits for iOS and Android (.next app).
#
# Usage (from monorepo root):
#   make mobile_eas_android_build                  # build beta .aab, wait, download it
#   make mobile_eas_ios_build                      # build beta .ipa, wait, download it
#   make mobile_eas_android_download               # download the latest finished beta build
#   make mobile_eas_ios_download BUILD_ID=<id>     # download one specific build
#   make mobile_eas_android_submit                 # upload the latest beta build as a Play draft
#   make mobile_eas_ios_submit                     # upload the latest beta build to TestFlight
#   make mobile_eas_android_submit ROLLOUT=1       # upload and roll out to the Play track
#   make mobile_eas_android_list                   # recent Android builds
#   make mobile_eas_ios_version                    # remote iOS build number EAS builds from
#   make mobile_eas_ios_credentials                # interactive iOS credentials menu
#   make mobile_eas_android_credentials            # interactive Android credentials menu
#   make mobile_eas_login                          # Expo account login
#   make mobile_eas_env_set NAME=EXPO_PUBLIC_FOO VALUE=bar
#                                              # create or update one variable on the profile's
#                                              # EAS environment (beta → preview)
#   make mobile_eas_env_set NAME=GOOGLE_SERVICES_JSON VALUE=/path/google-services.json \
#     TYPE=file VISIBILITY=secret
#   bash scripts/mobile/eas-store.sh <build|download|submit|list|version|credentials|login> \
#     --platform <ios|android> [--profile beta] [--build-id <id>] [--rollout]
#   bash scripts/mobile/eas-store.sh env-set --name <NAME> --value <VALUE> \
#     [--profile beta] [--environment preview] [--visibility plaintext] [--type string|file]
#
# Profiles come from apps/mobile/eas.json. `beta` and `production` produce store binaries;
# `internal` produces a dev-client build. Build numbers are stored remotely and auto-increment.
# Each profile pins an EAS environment (development / preview / production) for EXPO_PUBLIC_* values.
#
# Store profiles (beta, production) refuse a dirty working tree so EAS records match what you ship.
# The CLI runs with EXPO_NO_DOTENV=1 so a local apps/mobile/.env cannot change the resolved config.
#
# Store profiles (beta, production) require committed user-facing notes in
# release-notes/mobile/ before build and submit. EAS uploads the binary only;
# the script prints the text to paste into Play or the App Store. A store build
# also refuses while release-notes/scratchpad.md has entries (run abcreleasenotes).
# Nothing reaches testers without a typed confirmation. Android `submit` uses the eas.json submit
# profile named after --profile (`beta`), which leaves a Play draft. `--rollout` switches to
# `<profile>-rollout`, which publishes to the track and must be confirmed by typing the build's
# versionCode. iOS has no draft state: TestFlight internal groups with automatic distribution get
# the build after processing, so iOS submit always requires typing the build number.
# `build` and `submit` refuse to run without an interactive terminal.
#
# Signing credentials stay on EAS (iOS certs/profiles, Android keystore, ASC API key, Play service
# account). Fill submit.beta.ios / submit.production.ios ascAppId and appleTeamId in eas.json once
# the App Store Connect record exists (placeholders refuse submit).
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
PLATFORM=''
PROFILE='beta'
BUILD_ID=''
ROLLOUT=0
ENV_NAME=''
ENV_VALUE=''
ENV_VISIBILITY='plaintext'
ENV_TYPE='string'
EAS_ENVIRONMENT=''

usage() {
  awk 'NR == 1 { next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "$0"
}

die() {
  echo "Error: $*" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --platform)
      [[ $# -ge 2 && -n "$2" ]] || die '--platform needs a value (ios or android)'
      PLATFORM="$2"
      shift
      ;;
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
    --name)
      [[ $# -ge 2 && -n "$2" ]] || die '--name needs a value'
      ENV_NAME="$2"
      shift
      ;;
    --value)
      [[ $# -ge 2 && -n "$2" ]] || die '--value needs a value'
      ENV_VALUE="$2"
      shift
      ;;
    --visibility)
      [[ $# -ge 2 && -n "$2" ]] || die '--visibility needs a value (plaintext, sensitive, or secret)'
      ENV_VISIBILITY="$2"
      shift
      ;;
    --environment)
      [[ $# -ge 2 && -n "$2" ]] || die '--environment needs a value (development, preview, or production)'
      EAS_ENVIRONMENT="$2"
      shift
      ;;
    --type)
      [[ $# -ge 2 && -n "$2" ]] || die '--type needs a value (string or file)'
      ENV_TYPE="$2"
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *) die "unknown flag: $1 (supported: --platform, --profile, --build-id, --rollout, --name, --value, --visibility, --environment, --type)" ;;
  esac
  shift
done

if [[ -z "$COMMAND" || "$COMMAND" == '-h' || "$COMMAND" == '--help' ]]; then
  usage
  exit 0
fi

if [[ "$COMMAND" != 'env-set' && "$COMMAND" != 'login' ]]; then
  [[ -n "$PLATFORM" ]] || die '--platform is required (ios or android)'
  [[ "$PLATFORM" == 'ios' || "$PLATFORM" == 'android' ]] ||
    die "--platform must be ios or android (got '$PLATFORM')"
fi

# eas-cli has no --cwd; it reads eas.json and app.config.ts from the current directory.
# EXPO_NO_DOTENV=1 keeps a local apps/mobile/.env from overriding the EAS environment values.
eas() {
  (
    cd "$MOBILE_DIR"
    EXPO_NO_DOTENV=1 npx --yes "eas-cli@${EAS_CLI_VERSION}" "$@"
  )
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

is_store_profile() {
  [[ "$PROFILE" == 'beta' || "$PROFILE" == 'production' ]]
}

require_clean_tree_for_store() {
  local changed
  changed="$(git -C "$REPO_ROOT" status --porcelain | wc -l | tr -d ' ')"
  if [[ "$changed" -gt 0 ]]; then
    if is_store_profile; then
      die "Working tree has $changed uncommitted path(s). Store builds (profile '$PROFILE')" \
        "require a clean tree so the binary matches the recorded HEAD" \
        "($(git -C "$REPO_ROOT" rev-parse --short HEAD)). Commit or stash first."
    fi
    echo "Note: $changed uncommitted path(s) will be included in this build; EAS records HEAD" \
      "($(git -C "$REPO_ROOT" rev-parse --short HEAD)) as its commit."
  fi
}

# Prints the EAS environment name pinned on the build profile, or empty.
read_profile_environment() {
  node -e '
    const fs = require("fs");
    const [file, name] = process.argv.slice(1);
    const profile = JSON.parse(fs.readFileSync(file, "utf8")).build?.[name];
    if (!profile) {
      console.error(`eas.json has no build profile "${name}".`);
      process.exit(1);
    }
    process.stdout.write(String(profile.environment ?? ""));
  ' "$MOBILE_DIR/eas.json" "$PROFILE"
}

print_build_config() {
  local eas_env api_url web_url billing push contact
  eas_env="$(read_profile_environment)"
  echo "Platform:       $PLATFORM"
  echo "Profile:        $PROFILE"
  echo "EAS environment: ${eas_env:-"(none pinned in eas.json)"}"
  echo "HEAD:           $(git -C "$REPO_ROOT" rev-parse --short HEAD)"
  if [[ -z "$eas_env" ]]; then
    echo "Warning: build profile '$PROFILE' has no environment; EXPO_PUBLIC_* may be unset on EAS."
    return 0
  fi
  # Best-effort list of public config from the EAS environment (requires login).
  if env_json="$(eas env:list --environment "$eas_env" --json 2>/dev/null)"; then
    api_url="$(printf '%s' "$env_json" | node -e '
      let input = "";
      process.stdin.on("data", (c) => (input += c));
      process.stdin.on("end", () => {
        const rows = JSON.parse(input || "[]");
        const list = Array.isArray(rows) ? rows : (rows.data ?? rows.variables ?? []);
        const find = (name) => {
          const row = list.find((r) => (r.name ?? r.key) === name);
          return row ? String(row.value ?? row.plaintextValue ?? "(set)") : "(unset)";
        };
        process.stdout.write(
          [
            find("EXPO_PUBLIC_MOBILE_API_BASE_URL"),
            find("EXPO_PUBLIC_MOBILE_WEB_BASE_URL"),
            find("EXPO_PUBLIC_MOBILE_BILLING"),
            find("EXPO_PUBLIC_MOBILE_PUSH_PROVIDER"),
            find("EXPO_PUBLIC_CONTACT_EMAIL"),
          ].join("\t")
        );
      });
    ')"
    IFS=$'\t' read -r api_url web_url billing push contact <<<"$api_url"
    echo "EXPO_PUBLIC_MOBILE_API_BASE_URL:  $api_url"
    echo "EXPO_PUBLIC_MOBILE_WEB_BASE_URL:  $web_url"
    echo "EXPO_PUBLIC_MOBILE_BILLING:       $billing"
    echo "EXPO_PUBLIC_MOBILE_PUSH_PROVIDER: $push"
    echo "EXPO_PUBLIC_CONTACT_EMAIL:        $contact"
  else
    echo "Could not list EAS env '$eas_env' (login with: make mobile_eas_login)."
    echo "Confirm EXPO_PUBLIC_* for that environment on expo.dev before shipping."
  fi
}

print_version() {
  if [[ "$PLATFORM" == 'android' ]]; then
    echo "Remote Android versionCode for profile '$PROFILE' (the next build uses this + 1):"
  else
    echo "Remote iOS build number for profile '$PROFILE' (the next build uses this + 1):"
  fi
  eas build:version:get --platform "$PLATFORM" --profile "$PROFILE"
}

# Prints "<track>\t<releaseStatus>" for an Android submit profile, or fails when the profile is
# missing or leaves either field to the eas-cli default.
read_android_submit_profile() {
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

# Fails when iOS submit identifiers are still placeholders.
require_ios_submit_ids() {
  node -e '
    const fs = require("fs");
    const [file, name] = process.argv.slice(1);
    const ios = JSON.parse(fs.readFileSync(file, "utf8")).submit?.[name]?.ios;
    if (!ios) {
      console.error(`eas.json has no submit profile "${name}" with an ios section.`);
      process.exit(1);
    }
    const asc = String(ios.ascAppId ?? "");
    const team = String(ios.appleTeamId ?? "");
    if (!asc || asc.startsWith("REPLACE_") || !team || team.startsWith("REPLACE_")) {
      console.error(
        `Submit profile "${name}" still has placeholder ascAppId / appleTeamId.` +
          " Set the App Store Connect app id and Apple Team ID in apps/mobile/eas.json."
      );
      process.exit(1);
    }
  ' "$MOBILE_DIR/eas.json" "$1"
}

# Prints "<id>\t<url>\t<file name>\t<versionCode>\t<summary>" for one finished build: --build-id,
# else the newest finished build for the profile and platform.
resolve_build() {
  local json
  if [[ -n "$BUILD_ID" ]]; then
    json="$(eas build:view "$BUILD_ID" --json)"
  else
    json="$(eas build:list --platform "$PLATFORM" --status finished --build-profile "$PROFILE" \
      --limit 1 --json)"
  fi
  printf '%s' "$json" | node -e '
    let input = "";
    process.stdin.on("data", (chunk) => (input += chunk));
    process.stdin.on("end", () => {
      const parsed = JSON.parse(input);
      const build = Array.isArray(parsed) ? parsed[0] : parsed;
      const platform = process.argv[1];
      const profile = process.argv[2];
      if (!build) {
        console.error(
          `No finished ${platform} build found for profile "${profile}".`
        );
        process.exit(1);
      }
      const url = build.artifacts?.buildUrl;
      if (build.status !== "FINISHED" || !url) {
        console.error(`Build ${build.id} has status ${build.status} and no downloadable artifact.`);
        process.exit(1);
      }
      const extension = url.split(".").pop();
      const name =
        `podverse-next-${build.appVersion}-${build.appBuildVersion}-` +
        `${build.buildProfile}-${platform}.${extension}`;
      const summary = [
        `build ${build.id}`,
        `buildNumber ${build.appBuildVersion}`,
        `version ${build.appVersion}`,
        `SDK ${build.sdkVersion}`,
        `commit ${String(build.gitCommitHash).slice(0, 9)}`,
        `finished ${build.completedAt}`,
      ].join(", ");
      process.stdout.write(`${build.id}\t${url}\t${name}\t${build.appBuildVersion}\t${summary}\n`);
    });
  ' "$PLATFORM" "$PROFILE"
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
  elif [[ "$target" == *.ipa ]]; then
    echo "Upload it with Transporter or: make mobile_eas_ios_submit BUILD_ID=$id"
  fi
}

build() {
  require_terminal 'build'
  require_clean_tree_for_store
  print_version
  echo
  print_build_config
  echo
  if is_store_profile; then
    bash "$REPO_ROOT/scripts/publish/require-empty-release-scratchpad.sh" HEAD
    bash "$REPO_ROOT/scripts/publish/require-mobile-release-notes.sh" "$PLATFORM" HEAD
    echo
  fi
  confirm_yes \
    "Start an EAS $PLATFORM cloud build with profile '$PROFILE'? It uses the next build number."
  if [[ "$PLATFORM" == 'android' ]]; then
    echo "Reuse the existing keystore if eas-cli asks; a new one would not match Play's upload key."
  else
    echo "Reuse the existing iOS credentials if eas-cli asks; they must match the .next App ID."
  fi
  eas build --platform "$PLATFORM" --profile "$PROFILE"
  download
}

submit_android() {
  local submit_profile profile_fields track release_status
  local resolved id url name version_code summary
  submit_profile="$PROFILE"
  [[ "$ROLLOUT" -eq 1 ]] && submit_profile="${PROFILE}-rollout"
  profile_fields="$(read_android_submit_profile "$submit_profile")"
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
    echo "Paste the notes printed above into Release notes for that release."
  else
    echo "Draft created. Roll it out in Play Console: Test and release -> Testing ->" \
      "Internal testing -> Edit release -> Next -> Save and publish."
    echo "Paste the notes printed above into Release notes on that page."
  fi
}

submit_ios() {
  local submit_profile resolved id url name version_code summary
  [[ "$ROLLOUT" -eq 0 ]] ||
    die "iOS has no --rollout path; TestFlight distribution is controlled in App Store Connect."
  submit_profile="$PROFILE"
  require_ios_submit_ids "$submit_profile"

  resolved="$(resolve_build)"
  IFS=$'\t' read -r id url name version_code summary <<<"$resolved"
  echo
  echo "Build:     $summary"
  echo "Submit:    profile '$submit_profile' in apps/mobile/eas.json"
  echo
  echo "iOS has no draft state. After processing, TestFlight internal groups with automatic" \
    "distribution receive this build."
  confirm_typed "$version_code" \
    "Type the build number ($version_code) to submit to TestFlight:"

  if ! eas submit --platform ios --profile "$submit_profile" --id "$id" --wait; then
    echo >&2
    echo "Submit failed. Confirm ascAppId / appleTeamId in eas.json and that the App Store" \
      "Connect API key is stored on EAS (eas credentials)." >&2
    exit 1
  fi
  echo "Submitted build number $version_code to TestFlight."
  echo "Paste the notes printed above into TestFlight What to Test."
}

credentials() {
  require_terminal 'credentials'
  eas credentials --platform "$PLATFORM"
}

login() {
  require_terminal 'login'
  eas login
}

env_set() {
  local eas_env
  [[ -n "$ENV_NAME" ]] || die '--name is required (make mobile_eas_env_set NAME=...)'
  [[ -n "$ENV_VALUE" ]] || die '--value is required (make mobile_eas_env_set VALUE=...)'
  case "$ENV_VISIBILITY" in
    plaintext | sensitive | secret) ;;
    *) die "--visibility must be plaintext, sensitive, or secret (got '$ENV_VISIBILITY')" ;;
  esac
  case "$ENV_TYPE" in
    string | file) ;;
    *) die "--type must be string or file (got '$ENV_TYPE')" ;;
  esac
  if [[ "$ENV_TYPE" == 'file' && ! -f "$ENV_VALUE" ]]; then
    die "--value must be a file that exists when --type is file (got '$ENV_VALUE')"
  fi
  if [[ -n "$EAS_ENVIRONMENT" ]]; then
    eas_env="$EAS_ENVIRONMENT"
  else
    eas_env="$(read_profile_environment)"
  fi
  [[ -n "$eas_env" ]] || die "build profile '$PROFILE' has no environment in eas.json"
  case "$eas_env" in
    development | preview | production) ;;
    *) die "EAS environment must be development, preview, or production (got '$eas_env')" ;;
  esac

  echo "EAS environment: $eas_env (build profile '$PROFILE')"
  echo "Name:            $ENV_NAME"
  if [[ "$ENV_VISIBILITY" == 'plaintext' ]]; then
    echo "Value:           $ENV_VALUE"
  else
    echo "Value:           (hidden; visibility $ENV_VISIBILITY)"
  fi

  eas env:set --name "$ENV_NAME" --value "$ENV_VALUE" \
    --environment "$eas_env" --visibility "$ENV_VISIBILITY" --type "$ENV_TYPE" \
    --non-interactive
  echo "Set $ENV_NAME on the $eas_env environment."
}

submit() {
  require_terminal 'submit'
  if is_store_profile; then
    bash "$REPO_ROOT/scripts/publish/require-mobile-release-notes.sh" "$PLATFORM" HEAD
    echo
  fi
  if [[ "$PLATFORM" == 'android' ]]; then
    submit_android
  else
    submit_ios
  fi
}

case "$COMMAND" in
  build) build ;;
  download) download ;;
  submit) submit ;;
  list) eas build:list --platform "$PLATFORM" --limit 10 ;;
  version) print_version ;;
  credentials) credentials ;;
  login) login ;;
  env-set) env_set ;;
  '' | -h | --help) usage ;;
  *)
    usage >&2
    die "unknown command: $COMMAND (supported: build, download, submit, list, version, credentials, login, env-set)"
    ;;
esac

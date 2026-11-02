#!/usr/bin/env bash
# Every base CronJob has a podverse-schedule label, an active deadline, and a concurrency policy.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
TARGET_DIR="${1:-$ROOT/infra/k8s/base}"

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "ERROR: target directory not found: $TARGET_DIR" >&2
  exit 1
fi

if ! command -v yq >/dev/null 2>&1; then
  echo "ERROR: yq is required" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required" >&2
  exit 1
fi

# Nix ships kislyuk yq (a jq wrapper). GitHub-hosted runners ship mikefarah yq v4.
# Both accept this filter; only the output flags differ.
yq_help="$(yq --help 2>&1 || true)"
if [[ "$yq_help" == *"mikefarah/yq"* ]]; then
  YQ_FLAVOR="mikefarah"
elif [[ "$yq_help" == *"kislyuk/yq"* ]]; then
  YQ_FLAVOR="kislyuk"
else
  echo "ERROR: unrecognized yq. Need mikefarah yq v4 or kislyuk yq." >&2
  exit 1
fi

read_cronjobs() {
  local file="$1"
  # kislyuk yq is jq: objects have type "object". mikefarah yq reports "!!map".
  local kind_select='select(type == "object" and .kind == "CronJob")'
  if [[ "$YQ_FLAVOR" == "mikefarah" ]]; then
    kind_select='select(type == "!!map" and .kind == "CronJob")'
  fi
  local filter="$kind_select | {
      name: .metadata.name,
      schedule: .metadata.labels[\"podverse-schedule\"],
      suspend: .spec.suspend,
      deadline: .spec.jobTemplate.spec.activeDeadlineSeconds,
      concurrency: .spec.concurrencyPolicy
    }"
  if [[ "$YQ_FLAVOR" == "mikefarah" ]]; then
    yq -o=json -I=0 "$filter" "$file"
  else
    yq -c "$filter" "$file"
  fi
}

files=()
while IFS= read -r -d '' file; do
  files+=("$file")
done < <(find "$TARGET_DIR" -type f \( -name '*.yaml' -o -name '*.yml' \) -print0)

errors=0
count=0

for file in "${files[@]}"; do
  rel="$file"
  if [[ "$file" == "$ROOT/"* ]]; then
    rel="${file#"$ROOT"/}"
  fi

  if ! json="$(read_cronjobs "$file")"; then
    echo "ERROR: $rel: failed to parse YAML" >&2
    exit 1
  fi

  if [[ -z "$json" ]]; then
    continue
  fi

  while IFS= read -r obj; do
    if [[ -z "$obj" || "$obj" == "null" ]]; then
      continue
    fi
    count=$((count + 1))

    name="$(jq -r '.name // "<unnamed>"' <<<"$obj")"
    schedule="$(jq -r 'if .schedule == null then "" else .schedule end' <<<"$obj")"
    suspend="$(jq -r 'if .suspend == null then "" else (.suspend | tostring) end' <<<"$obj")"
    deadline="$(jq -r 'if .deadline == null then "" else (.deadline | tostring) end' <<<"$obj")"
    concurrency="$(jq -r 'if .concurrency == null then "" else .concurrency end' <<<"$obj")"

    if [[ "$schedule" != "scheduled" && "$schedule" != "manual" ]]; then
      echo "ERROR: $rel ($name): metadata.labels.podverse-schedule must be \"scheduled\" or \"manual\"" >&2
      errors=$((errors + 1))
    fi
    if [[ "$schedule" == "manual" && "$suspend" != "true" ]]; then
      echo "ERROR: $rel ($name): podverse-schedule manual requires spec.suspend true" >&2
      errors=$((errors + 1))
    fi
    if [[ "$schedule" == "scheduled" && "$suspend" == "true" ]]; then
      echo "ERROR: $rel ($name): podverse-schedule scheduled must not set spec.suspend true" >&2
      errors=$((errors + 1))
    fi
    if [[ -z "$deadline" ]]; then
      echo "ERROR: $rel ($name): spec.jobTemplate.spec.activeDeadlineSeconds is missing" >&2
      errors=$((errors + 1))
    fi
    if [[ -z "$concurrency" ]]; then
      echo "ERROR: $rel ($name): spec.concurrencyPolicy is missing" >&2
      errors=$((errors + 1))
    fi
  done <<<"$json"
done

if [[ "$count" -eq 0 ]]; then
  echo "ERROR: no CronJob manifests found under $TARGET_DIR" >&2
  exit 1
fi

if [[ "$errors" -ne 0 ]]; then
  echo "ERROR: CronJob contract check failed ($errors problem(s) in $count CronJob(s))" >&2
  exit 1
fi

echo "CronJob contract check passed ($count CronJobs under $TARGET_DIR)"

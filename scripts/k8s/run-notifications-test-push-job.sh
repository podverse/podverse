#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${K8S_NAMESPACE:-podverse-alpha}"
CRONJOB_NAME="ops-notifications-test-push"

if [ "$#" -lt 1 ]; then
  echo "Usage: bash scripts/k8s/run-notifications-test-push-job.sh [flags...]"
  echo "Example: bash scripts/k8s/run-notifications-test-push-job.sh --username example --list"
  exit 1
fi

safe='^[A-Za-z0-9._:=-]+$'
for arg in "$@"; do
  if ! printf '%s' "$arg" | grep -Eq "$safe"; then
    echo "Refusing argument that is not a plain flag or id: ${arg}"
    exit 1
  fi
done

args_json="$(node -e 'process.stdout.write(JSON.stringify(["notificationsTestPush"].concat(process.argv.slice(1))))' "$@")"

JOB_NAME="${CRONJOB_NAME}-manual-$(date +%s)"
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

kubectl -n "$NAMESPACE" create job "$JOB_NAME" --from="cronjob/${CRONJOB_NAME}" --dry-run=client -o json >"$tmp"

node -e '
const fs = require("node:fs");
const args = JSON.parse(process.argv[1]);
const path = process.argv[2];
const job = JSON.parse(fs.readFileSync(path, "utf8"));
const containers = job.spec && job.spec.template && job.spec.template.spec
  ? job.spec.template.spec.containers
  : null;
if (!Array.isArray(containers) || containers.length === 0) {
  process.stderr.write("ops-notifications-test-push CronJob has no container\n");
  process.exit(1);
}
containers[0].args = args;
fs.writeFileSync(path, JSON.stringify(job));
' "$args_json" "$tmp"

kubectl -n "$NAMESPACE" create -f "$tmp"

echo "Created job: ${JOB_NAME}"
echo "Next step: kubectl -n ${NAMESPACE} logs -f job/${JOB_NAME}"

#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${K8S_NAMESPACE:-podverse-alpha}"
CRONJOB_NAME="ops-notifications-test-push"

if [ "$#" -lt 1 ]; then
  echo "Usage: bash scripts/k8s/run-notifications-test-push-job.sh [flags...]"
  echo "Example: bash scripts/k8s/run-notifications-test-push-job.sh --email name@example.com --list"
  exit 1
fi

safe='^[A-Za-z0-9._:=@+-]+$'
for arg in "$@"; do
  if ! printf '%s' "$arg" | grep -Eq "$safe"; then
    echo "Refusing argument that is not a plain flag or id: ${arg}"
    exit 1
  fi
done

if ! image="$(kubectl -n "$NAMESPACE" get cronjob "$CRONJOB_NAME" -o jsonpath='{.spec.jobTemplate.spec.template.spec.containers[0].image}' 2>/dev/null)"; then
  echo "CronJob ${CRONJOB_NAME} is not in namespace ${NAMESPACE} yet. Sync podverse-alpha-ops, then retry."
  exit 1
fi
if [ -z "$image" ]; then
  echo "CronJob ${CRONJOB_NAME} has no container image."
  exit 1
fi
echo "Using ${image}"

# `--` keeps Node from treating worker flags such as --email as its own options.
args_json="$(node -e 'process.stdout.write(JSON.stringify(["notificationsTestPush"].concat(process.argv.slice(1))))' -- "$@")"

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
kubectl -n "$NAMESPACE" logs -f "job/${JOB_NAME}" -c worker --pod-running-timeout=120s

succeeded=""
failed=""
for _ in 1 2 3 4 5 6 7 8 9 10; do
  succeeded="$(kubectl -n "$NAMESPACE" get job "$JOB_NAME" -o jsonpath='{.status.succeeded}')"
  failed="$(kubectl -n "$NAMESPACE" get job "$JOB_NAME" -o jsonpath='{.status.failed}')"
  if [ "${succeeded}" = "1" ]; then
    exit 0
  fi
  if [ -n "${failed}" ] && [ "${failed}" != "0" ]; then
    echo "Job ${JOB_NAME} failed."
    exit 1
  fi
  sleep 1
done

echo "Job ${JOB_NAME} did not finish."
exit 1

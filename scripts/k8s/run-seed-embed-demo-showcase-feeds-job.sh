#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${K8S_NAMESPACE:-podverse-alpha}"
CRONJOB_NAME="seed-embed-demo-showcase-feeds"
JOB_NAME="${CRONJOB_NAME}-manual-$(date +%s)"

kubectl -n "$NAMESPACE" create job --from="cronjob/${CRONJOB_NAME}" "$JOB_NAME"

echo "Created job: ${JOB_NAME}"
echo "Next step: kubectl -n ${NAMESPACE} logs -f job/${JOB_NAME}"

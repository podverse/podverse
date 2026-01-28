#!/bin/bash
set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Usage: $0 <credentials_file> <jenkins_url>" >&2
  exit 1
fi

CRED_FILE="$1"
JENKINS_URL="$2"
JENKINS_FOLDER="pipelines/alpha"
JENKINS_API_PATH="job/pipelines/job/alpha"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

AUTH="$(cat "$CRED_FILE" | tr -d '\r\n')"

echo "Jenkins Jobs Verification"
echo "========================="
echo "Folder: $JENKINS_FOLDER/"
echo ""

# Get list of jobs from Jenkins using REST API
echo "Fetching existing jobs from Jenkins..."
JENKINS_JOBS=$(curl -s -u "$AUTH" "${JENKINS_URL}/${JENKINS_API_PATH}/api/json" | python3 -c "import sys, json; data = json.load(sys.stdin); print('\n'.join([job['name'] for job in data.get('jobs', [])]))" 2>/dev/null || echo "")

# Get list of local Jenkinsfiles
shopt -s nullglob
LOCAL_FILES=("$SCRIPT_DIR"/Jenkinsfile.*)
shopt -u nullglob

echo "Local Jenkinsfiles: ${#LOCAL_FILES[@]}"
echo ""

# Arrays to track different categories
declare -a TO_CREATE=()
declare -a TO_UPDATE=()
declare -a JENKINS_ONLY=()

# Check each local file
for FILE_PATH in "${LOCAL_FILES[@]}"; do
  JOB_NAME=$(basename "$FILE_PATH" | sed 's/Jenkinsfile.//')
  
  if echo "$JENKINS_JOBS" | grep -q "^${JOB_NAME}$"; then
    TO_UPDATE+=("$JOB_NAME")
  else
    TO_CREATE+=("$JOB_NAME")
  fi
done

# Check for jobs in Jenkins without local files
while IFS= read -r job; do
  [ -z "$job" ] && continue
  if [ ! -f "$SCRIPT_DIR/Jenkinsfile.$job" ]; then
    JENKINS_ONLY+=("$job")
  fi
done <<< "$JENKINS_JOBS"

# Display results
if [ ${#TO_CREATE[@]} -gt 0 ]; then
  echo "Jobs to CREATE: ${#TO_CREATE[@]}"
  for job in "${TO_CREATE[@]}"; do
    echo "  - $job -> ./infra/pipelines/jenkins/alpha/Jenkinsfile.$job"
  done
  echo ""
fi

if [ ${#TO_UPDATE[@]} -gt 0 ]; then
  echo "Jobs to UPDATE: ${#TO_UPDATE[@]}"
  for job in "${TO_UPDATE[@]}"; do
    echo "  - $job -> ./infra/pipelines/jenkins/alpha/Jenkinsfile.$job"
  done
  echo ""
fi

if [ ${#JENKINS_ONLY[@]} -gt 0 ]; then
  echo "Jobs in Jenkins (no local file): ${#JENKINS_ONLY[@]}"
  echo "These will NOT be touched:"
  for job in "${JENKINS_ONLY[@]}"; do
    echo "  - $job (SAFE)"
  done
  echo ""
fi

TOTAL_MODIFY=$((${#TO_CREATE[@]} + ${#TO_UPDATE[@]}))
echo "========================="
echo "Total jobs that will be modified: $TOTAL_MODIFY"
echo ""
echo "To proceed with update, run:"
echo "  ./import.sh $CRED_FILE $JENKINS_URL $JENKINS_FOLDER"

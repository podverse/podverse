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

echo "========================================"
echo "Jenkins Jobs Detailed Verification"
echo "========================================"
echo "Folder: $JENKINS_FOLDER/"
echo ""

# Expected values from scm-job.xml template
EXPECTED_BRANCH="*/develop"
EXPECTED_SPARSE_PATH="infra/pipelines/jenkins/"
EXPECTED_REPO="https://github.com/podverse/podverse.git"

# Get list of jobs from Jenkins using REST API
echo "Fetching existing jobs from Jenkins..."
JENKINS_JOBS=$(curl -s -u "$AUTH" "${JENKINS_URL}/${JENKINS_API_PATH}/api/json" | python3 -c "import sys, json; data = json.load(sys.stdin); print('\n'.join([job['name'] for job in data.get('jobs', [])]))" 2>/dev/null || echo "")

# Get list of local Jenkinsfiles
shopt -s nullglob
LOCAL_FILES=("$SCRIPT_DIR"/Jenkinsfile.*)
shopt -u nullglob

echo "Local Jenkinsfiles: ${#LOCAL_FILES[@]}"
echo ""

# Function to extract value from XML (simple grep/sed approach)
extract_xml() {
  local xml="$1"
  local tag="$2"
  echo "$xml" | grep -o "<${tag}>.*</${tag}>" | sed "s|<${tag}>||;s|</${tag}>||" | head -1
}

# Function to check if sparse checkout path exists
check_sparse_path() {
  local xml="$1"
  local path="$2"
  echo "$xml" | grep -q "<path>${path}</path>" && echo "yes" || echo "no"
}

# Counters
TOTAL_CREATE=0
TOTAL_UPDATE=0
TOTAL_CHANGES=0
TOTAL_NO_CHANGE=0

# Process each local Jenkinsfile
for FILE_PATH in "${LOCAL_FILES[@]}"; do
  JOB_NAME=$(basename "$FILE_PATH" | sed 's/Jenkinsfile.//')
  EXPECTED_SCRIPT_PATH="./infra/pipelines/jenkins/alpha/Jenkinsfile.$JOB_NAME"
  
  # Check if job exists in Jenkins
  if echo "$JENKINS_JOBS" | grep -q "^${JOB_NAME}$"; then
    # Job exists - fetch current config and compare
    CURRENT_CONFIG=$(curl -s -u "$AUTH" "${JENKINS_URL}/${JENKINS_API_PATH}/job/${JOB_NAME}/config.xml" 2>/dev/null || echo "")
    
    if [ -n "$CURRENT_CONFIG" ]; then
      # Extract current values
      CURRENT_SCRIPT_PATH=$(extract_xml "$CURRENT_CONFIG" "scriptPath")
      CURRENT_BRANCH=$(extract_xml "$CURRENT_CONFIG" "name")
      CURRENT_REPO=$(extract_xml "$CURRENT_CONFIG" "url")
      CURRENT_HAS_SPARSE=$(check_sparse_path "$CURRENT_CONFIG" "$EXPECTED_SPARSE_PATH")
      
      # Check for differences
      NEEDS_UPDATE="no"
      declare -a CHANGES=()
      
      if [ "$CURRENT_SCRIPT_PATH" != "$EXPECTED_SCRIPT_PATH" ]; then
        CHANGES+=("  scriptPath: '$CURRENT_SCRIPT_PATH' -> '$EXPECTED_SCRIPT_PATH'")
        NEEDS_UPDATE="yes"
      fi
      
      if [ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]; then
        CHANGES+=("  branch: '$CURRENT_BRANCH' -> '$EXPECTED_BRANCH'")
        NEEDS_UPDATE="yes"
      fi
      
      if [ "$CURRENT_REPO" != "$EXPECTED_REPO" ]; then
        CHANGES+=("  repository: '$CURRENT_REPO' -> '$EXPECTED_REPO'")
        NEEDS_UPDATE="yes"
      fi
      
      if [ "$CURRENT_HAS_SPARSE" != "yes" ]; then
        CHANGES+=("  sparse checkout: will add '$EXPECTED_SPARSE_PATH'")
        NEEDS_UPDATE="yes"
      fi
      
      if [ "$NEEDS_UPDATE" = "yes" ]; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "UPDATE: $JOB_NAME"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        for change in "${CHANGES[@]}"; do
          echo "$change"
        done
        echo ""
        ((TOTAL_UPDATE++))
        ((TOTAL_CHANGES++))
      else
        echo "✓ No changes needed: $JOB_NAME (already correct)"
        ((TOTAL_UPDATE++))
        ((TOTAL_NO_CHANGE++))
      fi
    fi
  else
    # Job doesn't exist - will be created
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "CREATE: $JOB_NAME"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Job Name: $JOB_NAME"
    echo "  scriptPath: $EXPECTED_SCRIPT_PATH"
    echo "  branch: $EXPECTED_BRANCH"
    echo "  repository: $EXPECTED_REPO"
    echo "  sparse checkout: $EXPECTED_SPARSE_PATH"
    echo ""
    ((TOTAL_CREATE++))
    ((TOTAL_CHANGES++))
  fi
done

# Check for orphaned jobs (exist in Jenkins but no local Jenkinsfile)
declare -a ORPHANED=()
while IFS= read -r job; do
  [ -z "$job" ] && continue
  if [ ! -f "$SCRIPT_DIR/Jenkinsfile.$job" ]; then
    ORPHANED+=("$job")
  fi
done <<< "$JENKINS_JOBS"

if [ ${#ORPHANED[@]} -gt 0 ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "ORPHANED JOBS (no local Jenkinsfile)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "These jobs exist in Jenkins but have no matching local Jenkinsfile."
  echo "They will NOT be modified by import.sh:"
  echo ""
  for job in "${ORPHANED[@]}"; do
    echo "  - $job (SAFE - will not be touched)"
  done
  echo ""
fi

# Summary
echo "========================================"
echo "SUMMARY"
echo "========================================"
echo "Jobs to CREATE: $TOTAL_CREATE"
echo "Jobs to UPDATE: $TOTAL_UPDATE"
echo "  - With changes: $TOTAL_CHANGES"
echo "  - Already correct: $TOTAL_NO_CHANGE"
echo "Orphaned jobs: ${#ORPHANED[@]}"
echo ""
echo "Total jobs that will be modified: $TOTAL_CHANGES"
echo ""

if [ $TOTAL_CHANGES -gt 0 ]; then
  echo "To proceed with update, run:"
  echo "  ./import.sh $CRED_FILE $JENKINS_URL $JENKINS_FOLDER"
else
  echo "All jobs are already up to date! No import needed."
fi

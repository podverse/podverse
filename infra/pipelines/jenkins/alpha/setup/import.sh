#!/bin/bash
set -euo pipefail

if [[ $# -lt 3 ]]; then
  echo "Usage: $0 <credentials_file> <jenkins_url> <jenkins_folder>" >&2
  exit 1
fi

CRED_FILE="$1"
JENKINS_URL="$2"
JENKINS_FOLDER="$3"
JENKINS_API_PATH="job/pipelines/job/alpha"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Calculate repo root (4 levels up from alpha directory)
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

# Parse credentials
AUTH="$(cat "$CRED_FILE" | tr -d '\r\n')"
USER=$(echo "$AUTH" | cut -d: -f1)
PASS=$(echo "$AUTH" | cut -d: -f2-)

if [[ -z "${USER}" || -z "${PASS}" ]]; then
  echo "ERROR: Parsed username or password is empty." >&2
  exit 1
fi

echo "Authenticated as: ${USER}"

# 1. Ensure the folder exists (create parent folders if needed)
echo "Ensuring folder structure exists..."
# Create 'pipelines' folder if it doesn't exist
curl -s -u "$AUTH" -X POST "${JENKINS_URL}/createItem?name=pipelines&mode=com.cloudbees.hudson.plugins.folder.Folder" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  > /dev/null 2>&1 || true

# Create 'alpha' folder inside 'pipelines' if it doesn't exist
curl -s -u "$AUTH" -X POST "${JENKINS_URL}/job/pipelines/createItem?name=alpha&mode=com.cloudbees.hudson.plugins.folder.Folder" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  > /dev/null 2>&1 || true

echo "Folder '$JENKINS_FOLDER' is ready (created or already exists)"

# 2. Discover Jenkinsfiles in the current script directory
shopt -s nullglob
declare -a FILES=()
for jf in "$SCRIPT_DIR"/Jenkinsfile.*; do
  # Convert absolute path to repo-root-relative path starting with './'
  rel_path="${jf#$REPO_ROOT/}"
  rel="./$rel_path"
  FILES+=("$rel")
done
shopt -u nullglob

# Fail early if no Jenkinsfiles are found
if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "ERROR: No files matching 'Jenkinsfile.*' found in $SCRIPT_DIR" >&2
  exit 1
fi

# 3. Create or update jobs for each file
for FILE_PATH in "${FILES[@]}"; do
  # Extract job name (e.g., './infra/pipelines/jenkins/alpha/Jenkinsfile.srv_api_up' -> 'srv_api_up')
  JOB_NAME=$(basename "$FILE_PATH" | sed 's/Jenkinsfile.//')

  # Check if job already exists
  JOB_EXISTS=$(curl -s -o /dev/null -w "%{http_code}" -u "$AUTH" "${JENKINS_URL}/${JENKINS_API_PATH}/job/${JOB_NAME}/api/json")
  
  # Read and prepare the XML template
  JOB_XML=$(sed "s|REPLACE_SCRIPT_PATH|$FILE_PATH|g" "${SCRIPT_DIR}/scm-job.xml")
  
  if [ "$JOB_EXISTS" = "200" ]; then
    echo "Updating job: $JENKINS_FOLDER/$JOB_NAME pointing to $FILE_PATH"
    curl -s -u "$AUTH" -X POST "${JENKINS_URL}/${JENKINS_API_PATH}/job/${JOB_NAME}/config.xml" \
      -H "Content-Type: application/xml" \
      -d "$JOB_XML" > /dev/null
  else
    echo "Creating job: $JENKINS_FOLDER/$JOB_NAME pointing to $FILE_PATH"
    curl -s -u "$AUTH" -X POST "${JENKINS_URL}/${JENKINS_API_PATH}/createItem?name=${JOB_NAME}" \
      -H "Content-Type: application/xml" \
      -d "$JOB_XML" > /dev/null
  fi
done

echo "✓ Successfully processed ${#FILES[@]} jobs"

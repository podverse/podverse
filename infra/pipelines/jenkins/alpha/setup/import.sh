#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ALPHA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Repo root (5 levels up from setup: setup → alpha → jenkins → pipelines → infra → root)
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../../../" && pwd)"
JENKINSFILES_DIR="$ALPHA_DIR"
SCM_JOB_XML_PATH="$ALPHA_DIR/scm-job.xml"

# Supports either positional args or environment variables:
# - CRED_FILE / JENKINS_CREDENTIALS_FILE
# - JENKINS_URL
# - JENKINS_FOLDER
CRED_FILE="${1:-${CRED_FILE:-${JENKINS_CREDENTIALS_FILE:-}}}"
JENKINS_URL="${2:-${JENKINS_URL:-}}"
JENKINS_FOLDER="${3:-${JENKINS_FOLDER:-pipelines/alpha}}"
JENKINS_URL="${JENKINS_URL%/}"

if [[ -z "$CRED_FILE" || -z "$JENKINS_URL" || -z "$JENKINS_FOLDER" ]]; then
  echo "Usage: $0 <credentials_file> <jenkins_url> <jenkins_folder>" >&2
  echo "Or set env vars: JENKINS_CREDENTIALS_FILE, JENKINS_URL, JENKINS_FOLDER" >&2
  exit 1
fi

if [[ ! -f "$CRED_FILE" ]]; then
  echo "ERROR: Credentials file not found: $CRED_FILE" >&2
  exit 1
fi

if [[ ! -f "$SCM_JOB_XML_PATH" ]]; then
  echo "ERROR: Jenkins job template not found: $SCM_JOB_XML_PATH" >&2
  exit 1
fi

folder_to_api_path() {
  local folder="$1"
  local api_path=""
  IFS='/' read -r -a segments <<< "$folder"
  for segment in "${segments[@]}"; do
    if [[ -n "$segment" ]]; then
      api_path="${api_path}/job/${segment}"
    fi
  done
  echo "${api_path#/}"
}

ensure_folder_structure_exists() {
  local folder="$1"
  local current_path=""
  IFS='/' read -r -a segments <<< "$folder"
  for segment in "${segments[@]}"; do
    if [[ -z "$segment" ]]; then
      continue
    fi
    if [[ -z "$current_path" ]]; then
      curl -s -u "$AUTH" -X POST \
        "${JENKINS_URL}/createItem?name=${segment}&mode=com.cloudbees.hudson.plugins.folder.Folder" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        > /dev/null 2>&1 || true
      current_path="job/${segment}"
    else
      curl -s -u "$AUTH" -X POST \
        "${JENKINS_URL}/${current_path}/createItem?name=${segment}&mode=com.cloudbees.hudson.plugins.folder.Folder" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        > /dev/null 2>&1 || true
      current_path="${current_path}/job/${segment}"
    fi
  done
}

JENKINS_API_PATH="$(folder_to_api_path "$JENKINS_FOLDER")"

# Parse credentials
AUTH="$(tr -d '\r\n' < "$CRED_FILE")"
USER=$(echo "$AUTH" | cut -d: -f1)
PASS=$(echo "$AUTH" | cut -d: -f2-)

if [[ -z "${USER}" || -z "${PASS}" ]]; then
  echo "ERROR: Parsed username or password is empty." >&2
  exit 1
fi

echo "Authenticated as: ${USER}"

# 1. Ensure the folder exists (create parent folders if needed)
echo "Ensuring folder structure exists..."
ensure_folder_structure_exists "$JENKINS_FOLDER"

echo "Folder '$JENKINS_FOLDER' is ready (created or already exists)"

# 2. Discover Jenkinsfiles in alpha directory
shopt -s nullglob
declare -a FILES=()
for jf in "$JENKINSFILES_DIR"/Jenkinsfile.*; do
  # Convert absolute path to repo-root-relative path starting with './'
  rel_path="${jf#$REPO_ROOT/}"
  rel="./$rel_path"
  FILES+=("$rel")
done
shopt -u nullglob

# Fail early if no Jenkinsfiles are found
if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "ERROR: No files matching 'Jenkinsfile.*' found in $JENKINSFILES_DIR" >&2
  exit 1
fi

# 3. Create or update jobs for each file
for FILE_PATH in "${FILES[@]}"; do
  # Extract job name (e.g., './infra/pipelines/jenkins/alpha/Jenkinsfile.srv_api_up' -> 'srv_api_up')
  JOB_NAME=$(basename "$FILE_PATH" | sed 's/Jenkinsfile.//')

  # Check if job already exists
  JOB_EXISTS=$(curl -s -o /dev/null -w "%{http_code}" -u "$AUTH" "${JENKINS_URL}/${JENKINS_API_PATH}/job/${JOB_NAME}/api/json")
  
  # Read and prepare the XML template
  JOB_XML=$(sed "s|REPLACE_SCRIPT_PATH|$FILE_PATH|g" "$SCM_JOB_XML_PATH")
  
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

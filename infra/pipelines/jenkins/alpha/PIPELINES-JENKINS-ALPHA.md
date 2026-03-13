# Alpha Jenkins Sync

This directory contains Jenkins pipeline definitions and setup scripts used to align the
`pipelines/alpha` folder in Jenkins with the `Jenkinsfile.*` files in this monorepo.

## What to run

Run all commands from the monorepo root. The workflow is:

1. Initialize env file
2. Smoke test (read-only)
3. Apply sync changes
4. Re-run smoke test to confirm zero pending changes

### 1) Initialize setup env file

```bash
make alpha_jenkins_sync_init
```

This creates:

- `infra/pipelines/jenkins/alpha/setup/jenkins-sync.env` (if missing)
- From: `infra/pipelines/jenkins/alpha/setup/jenkins-sync.env.example`

### 2) Configure credentials and URL

Edit `infra/pipelines/jenkins/alpha/setup/jenkins-sync.env`:

```dotenv
JENKINS_URL="https://jenkins.example.com"
JENKINS_CREDENTIALS_FILE="$HOME/.jenkins-api-token"
JENKINS_FOLDER="pipelines/alpha"
```

`JENKINS_CREDENTIALS_FILE` must point to a file containing one line:

```text
username:api_token
```

### 3) Smoke test (safe, no writes)

Quick summary:

```bash
make alpha_jenkins_sync_smoke
```

Detailed diff (recommended before apply):

```bash
make alpha_jenkins_sync_smoke_detailed
```

These targets call verify scripts only and do not create/update Jenkins jobs.

### 4) Apply sync changes

```bash
make alpha_jenkins_sync_apply
```

This runs the import script and creates/updates jobs under `JENKINS_FOLDER`.

### 5) Confirm convergence

```bash
make alpha_jenkins_sync_smoke_detailed
```

Success criteria: `Total jobs that will be modified: 0`.

## Script locations

- Import: `infra/pipelines/jenkins/alpha/setup/import.sh`
- Verify summary: `infra/pipelines/jenkins/alpha/setup/verify-jobs.sh`
- Verify detailed: `infra/pipelines/jenkins/alpha/setup/verify-jobs-detailed.sh`
- Job template: `infra/pipelines/jenkins/alpha/scm-job.xml`
- Source Jenkinsfiles: `infra/pipelines/jenkins/alpha/Jenkinsfile.*`

## Notes

- The import/verify scripts now support both:
  - explicit CLI args, and
  - env vars from `jenkins-sync.env` via make targets.
- `JENKINS_FOLDER` is used to compute Jenkins API paths (for example,
  `pipelines/alpha` -> `job/pipelines/job/alpha`).

## Troubleshooting

Authentication errors:

- Confirm `JENKINS_CREDENTIALS_FILE` exists
- Confirm the file format is `username:api_token` on one line
- Confirm the Jenkins user has permission to read/create/update jobs

No local Jenkinsfiles detected:

- Confirm files exist under `infra/pipelines/jenkins/alpha/Jenkinsfile.*`

Template not found:

- Confirm `infra/pipelines/jenkins/alpha/scm-job.xml` exists

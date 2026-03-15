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

**Always run the detailed smoke before applying.** It shows exactly which jobs would be created or
updated and for what (including script path). It compares each job’s `scriptPath` to
`./infra/pipelines/jenkins/alpha/Jenkinsfile.<jobname>` and reports mismatches (e.g. missing
`infra/`). No jobs are modified.

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

Run this only after reviewing the output of `make alpha_jenkins_sync_smoke_detailed`:

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

## Full teardown and rebuild

- **alpha_teardown_all**: Destructive job that removes all containers, images, and volumes on both
  alpha aux and alpha srv, and wipes Postgres data at `/mnt/podverse_alpha_db_data`. It requires an
  explicit confirmation parameter (choice) before running. Does not rely on Make or compose files.
- **alpha_rebuild_all**: Brings alpha from a clean state (Docker only) to fully running: creates
  network on both nodes, git pull, Postgres up, App DB init, Management DB init (same Postgres
  container), keyvaldb, MQ, workers,
  then API/management-api/web/management-web. Use after alpha_teardown_all or when the environment
  is empty. These two jobs replace the manual one-time clean-slate procedure (wipe DB data, re-init
  both DBs) documented elsewhere.

## One-time setup on alpha agents (srv and aux)

Alpha Docker services (api, management-api, workers) write logs to **host paths outside the
workspace** (`/var/log/podverse/<service>`) so that Jenkins checkout never hits root-owned
directories and `git clean` does not fail with "Permission denied".

On **each** alpha agent (srv and aux), run **once** as root (e.g. when provisioning a new server or
a new Jenkins agent):

```bash
sudo mkdir -p /var/log/podverse
sudo chown <jenkins_agent_user>:<jenkins_agent_user> /var/log/podverse
```

Replace `<jenkins_agent_user>` with the user that runs the Jenkins agent on that node (e.g.
`pv-jenkins`). After this, Jenkins jobs create service subdirs (`management-api`, `api`, `workers`)
and Docker containers write logs there; the workspace stays clean and checkout always succeeds.

## Troubleshooting

Pipeline reports "file not found" when running:

- The job’s Script Path in Jenkins must be `infra/pipelines/jenkins/alpha/Jenkinsfile.<name>` (with
  the `infra/` prefix). Run `make alpha_jenkins_sync_smoke_detailed` to see current vs expected
  script path; then run `make alpha_jenkins_sync_apply` to fix all jobs.

Authentication errors:

- Confirm `JENKINS_CREDENTIALS_FILE` exists
- Confirm the file format is `username:api_token` on one line
- Confirm the Jenkins user has permission to read/create/update jobs

No local Jenkinsfiles detected:

- Confirm files exist under `infra/pipelines/jenkins/alpha/Jenkinsfile.*`

Template not found:

- Confirm `infra/pipelines/jenkins/alpha/scm-job.xml` exists

Checkout fails with "Permission denied" on `logs/...` (git clean):

- Alpha log dirs are now under `/var/log/podverse/`, not in the workspace. If you still see
  permission errors on `logs/management-api` (or similar), the agent may have been used before this
  change. Fix the current workspace once: on the agent run
  `sudo chown -R <jenkins_user>:<jenkins_user> /home/<jenkins_user>/workspace/pipelines/alpha/srv_management_api_up`
  (or the reported workspace path). Ensure the one-time setup above is done so future runs never
  create root-owned dirs in the workspace.

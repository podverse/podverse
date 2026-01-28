# Phase 4D: Jenkins Pipelines Migration

**Status**: Ready for execution
**Estimated effort**: 2-3 hours
**Dependencies**: Parts A-C (pipelines reference docker and script paths)
**Special requirement**: Server coordination needed

## Overview

Migrate Jenkins pipeline files from podverse-ops to the monorepo. This requires coordinated changes to both the monorepo files AND the alpha server configuration.

## Server Path Change

The alpha server currently has:

```
/opt/podverse-ops/
├── config/
├── docker-compose/
├── pipelines/
├── scripts/
└── Makefile
```

After migration, the server will need:

```
/opt/podverse/
├── infra/
│   ├── config/
│   ├── database/
│   ├── docker/      # (was docker-compose/)
│   └── proxy/
├── pipelines/
│   └── jenkins/
│       └── alpha/
├── scripts/
└── Makefile         # Need to create/update
```

## Files to Migrate

### Pipeline Files (20 files)

| File                                        | Purpose                       |
| ------------------------------------------- | ----------------------------- |
| `Jenkinsfile.alpha_deploy_all`              | Full deployment orchestration |
| `Jenkinsfile.alpha_reset_db_and_deploy_all` | Deploy with DB reset          |
| `Jenkinsfile.srv_all_down`                  | Stop all services             |
| `Jenkinsfile.srv_api_down`                  | Stop API                      |
| `Jenkinsfile.srv_api_up`                    | Start API                     |
| `Jenkinsfile.srv_docker_prune_images`       | Clean Docker images           |
| `Jenkinsfile.srv_management_api_down`       | Stop Management API           |
| `Jenkinsfile.srv_management_api_up`         | Start Management API          |
| `Jenkinsfile.srv_management_web_down`       | Stop Management Web           |
| `Jenkinsfile.srv_management_web_up`         | Start Management Web          |
| `Jenkinsfile.srv_network_create`            | Create Docker network         |
| `Jenkinsfile.srv_network_remove`            | Remove Docker network         |
| `Jenkinsfile.srv_ops_git_pull`              | Git pull on server            |
| `Jenkinsfile.srv_web_down`                  | Stop Web                      |
| `Jenkinsfile.srv_web_up`                    | Start Web                     |
| `Jenkinsfile.u_all_down`                    | Stop all (aux server)         |
| `Jenkinsfile.u_ops_git_pull`                | Git pull (aux server)         |
| `import.sh`                                 | Import jobs to Jenkins        |
| `README.md`                                 | Documentation                 |
| `scm-job.xml`                               | Jenkins job template          |

## Path Updates Required

### Pattern 1: Directory references

**Before:**

```groovy
dir('/opt/podverse-ops/docker-compose/alpha/api')
```

**After:**

```groovy
dir('/opt/podverse/infra/docker/alpha/api')
```

### Pattern 2: Script references

**Before:**

```groovy
sh(script: '/opt/podverse-ops/scripts/ghcr/getLatestAlphaTag.sh', returnStdout: true)
```

**After:**

```groovy
sh(script: '/opt/podverse/scripts/ghcr/getLatestAlphaTag.sh', returnStdout: true)
```

### Pattern 3: Make commands

**Before:**

```groovy
dir('/opt/podverse-ops') {
    sh 'make alpha_api_up'
}
```

**After:**

```groovy
dir('/opt/podverse') {
    sh 'make alpha_api_up'
}
```

### Pattern 4: File cleanup

**Before:**

```groovy
rm /opt/podverse-ops/docker-compose/alpha/api/docker-compose.yml || true
```

**After:**

```groovy
rm /opt/podverse/infra/docker/alpha/api/docker-compose.yml || true
```

## Complete Path Mapping

| Old Path                                  | New Path                            |
| ----------------------------------------- | ----------------------------------- |
| `/opt/podverse-ops`                       | `/opt/podverse`                     |
| `/opt/podverse-ops/docker-compose/alpha/` | `/opt/podverse/infra/docker/alpha/` |
| `/opt/podverse-ops/scripts/`              | `/opt/podverse/scripts/`            |
| `/opt/podverse-ops/config/`               | `/opt/podverse/infra/config/`       |

## Tasks

### Task 1: Copy all pipeline files

```
podverse-ops/pipelines/alpha/
  -> pipelines/jenkins/alpha/
```

### Task 2: Update path references in each Jenkinsfile

Files requiring updates:

- `Jenkinsfile.srv_api_up` - 3 path references
- `Jenkinsfile.srv_web_up` - 3 path references
- `Jenkinsfile.srv_management_api_up` - 3 path references
- `Jenkinsfile.srv_management_web_up` - 3 path references
- `Jenkinsfile.srv_ops_git_pull` - 4 path references
- `Jenkinsfile.u_ops_git_pull` - 4 path references
- `Jenkinsfile.srv_all_down` - 1 path reference
- `Jenkinsfile.srv_api_down` - 1 path reference
- `Jenkinsfile.srv_web_down` - 1 path reference
- `Jenkinsfile.srv_management_api_down` - 1 path reference
- `Jenkinsfile.srv_management_web_down` - 1 path reference
- `Jenkinsfile.srv_docker_prune_images` - 1 path reference
- `Jenkinsfile.srv_network_create` - 1 path reference
- `Jenkinsfile.srv_network_remove` - 1 path reference

### Task 3: Update import.sh

Update the script paths in `import.sh` to reflect new location:

```bash
# Before
"./pipelines/alpha/Jenkinsfile.srv_api_up"

# After
"./pipelines/jenkins/alpha/Jenkinsfile.srv_api_up"
```

### Task 4: Create/Update Makefile

The monorepo needs a Makefile with alpha deployment targets. This may already exist or need to be created.

Required targets:

- `alpha_api_up`
- `alpha_api_down`
- `alpha_web_up`
- `alpha_web_down`
- `alpha_management_api_up`
- `alpha_management_api_down`
- `alpha_management_web_up`
- `alpha_management_web_down`
- `alpha_network_create`
- `alpha_network_remove`
- `alpha_docker_prune_images`

## Server Deployment Plan

### Step 1: Prepare server (before cutover)

```bash
# On alpha server
cd /opt
git clone https://github.com/podverse/podverse.git
cd podverse
git checkout v5-develop

# Create symlink for backward compatibility (optional)
# ln -s /opt/podverse /opt/podverse-ops
```

### Step 2: Copy environment files

```bash
# Copy from old location to new
cp /opt/podverse-ops/config/podverse-alpha-*.env /opt/podverse/infra/config/alpha/
```

### Step 3: Update Jenkins jobs

- Use `import.sh` to update all Jenkins jobs with new paths
- Or manually update job configurations in Jenkins UI

### Step 4: Test deployment

- Run `srv_ops_git_pull` to verify git operations
- Run a test deploy of one service (e.g., `srv_api_up`)
- Verify logs and service health

### Step 5: Full deployment

- Run `alpha_deploy_all` to deploy all services

## Rollback Plan

If issues arise:

1. Keep `/opt/podverse-ops` intact during transition
2. Revert Jenkins jobs to old paths using original `import.sh`
3. Continue using old deployment until issues resolved

## Verification Steps

1. All Jenkinsfiles pass `groovy -c` syntax check
2. `import.sh` runs successfully against test Jenkins
3. Test deployment completes without errors
4. All services start and respond correctly

## Notes

- The `aux` server jobs (`Jenkinsfile.u_*`) follow the same pattern
- The workers are deployed on a separate server (aux) with similar paths
- Jenkins job names can remain the same; only the internal paths change
- Consider creating a canary deployment pattern for safer rollouts

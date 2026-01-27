# Alpha Monorepo Migration - Deployment Testing Checklist

This checklist should be completed before considering the migration complete. It verifies that all changes work correctly in the actual alpha environment.

## Pre-Deployment Verification

### Ansible Configuration

- [ ] Verify `podverse_monorepo` role syntax:
  ```bash
  cd podverse-ansible
  ansible-playbook --syntax-check podverse-alpha-srv.yaml
  ansible-playbook --syntax-check podverse-alpha-aux.yaml
  ```

- [ ] Verify all alpha config role file paths exist:
  ```bash
  # From podverse-ansible directory:
  find roles/podverse_alpha_*/files/opt/podverse/infra/config/alpha -type f
  # Should show 8 files (7 .env files + 1 firebase-admin.json)
  ```

- [ ] Confirm no `podverse-ops` references in alpha roles:
  ```bash
  grep -r "podverse-ops" roles/podverse_alpha_* roles/podverse_monorepo podverse-alpha-*.yaml
  # Should return no results
  ```

### Jenkins Configuration

- [ ] Verify `scm-job.xml` has sparse checkout configured:
  ```bash
  # From podverse-ansible directory:
  grep -A 10 "SparseCheckoutPaths" ../podverse/pipelines/jenkins/alpha/scm-job.xml
  # Or from podverse directory:
  grep -A 10 "SparseCheckoutPaths" pipelines/jenkins/alpha/scm-job.xml
  ```

- [ ] Confirm Jenkinsfiles reference monorepo paths:
  ```bash
  # From podverse-ansible directory:
  grep -r "/opt/podverse" ../podverse/pipelines/jenkins/alpha/Jenkinsfile.* | head -5
  # Or from podverse directory:
  grep -r "/opt/podverse" pipelines/jenkins/alpha/Jenkinsfile.* | head -5
  # Should show /opt/podverse references, not /opt/podverse-ops
  ```

## Deployment Testing (Dry-Run)

### Step 1: Ansible Playbook Dry-Run

- [ ] Run alpha-srv playbook in check mode:
  ```bash
  # From podverse-ansible directory:
  ansible-playbook --check --diff podverse-alpha-srv.yaml
  ```
  - Verify it would create `/opt/podverse` directory
  - Verify it would clone monorepo with sparse checkout
  - Verify it would deploy configs to `/opt/podverse/infra/config/alpha/`

- [ ] Run alpha-aux playbook in check mode:
  ```bash
  # From podverse-ansible directory:
  ansible-playbook --check --diff podverse-alpha-aux.yaml
  ```
  - Verify it would create `/opt/podverse` directory
  - Verify it would clone monorepo with sparse checkout
  - Verify it would deploy configs to `/opt/podverse/infra/config/alpha/`

### Step 2: Verify Sparse Checkout

After running playbooks (or on existing server):

- [ ] SSH to alpha-srv and verify sparse checkout:
  ```bash
  ssh alpha-srv
  ls -la /opt/podverse/
  # Should show: infra/, pipelines/, scripts/, Makefile, Makefile.alpha
  # Should NOT show: apps/, packages/, etc.
  ```

- [ ] Verify sparse checkout paths:
  ```bash
  cat /opt/podverse/.git/info/sparse-checkout
  # Should list: pipelines/jenkins/, infra/docker/, infra/config/, scripts/, Makefile, Makefile.alpha
  ```

- [ ] Verify config files exist:
  ```bash
  ls -la /opt/podverse/infra/config/alpha/
  # Should show all alpha .env files
  ```

### Step 3: Jenkins Job Testing

- [ ] Import Jenkins jobs (if not already done):
  ```bash
  # From podverse-ansible directory:
  cd ../podverse/pipelines/jenkins/alpha
  bash import.sh ~/.jenkins-api-token
  # Or from podverse directory:
  cd pipelines/jenkins/alpha
  bash import.sh ~/.jenkins-api-token
  ```

- [ ] Verify Jenkins workspace structure:
  - Check Jenkins agent workspace at `/opt/podverse`
  - Confirm sparse checkout is working (only deployment dirs present)
  - Verify no `podverse-ops` directory exists

- [ ] Test a simple pipeline:
  - Run `srv_ops_git_pull` job
  - Verify it pulls from monorepo successfully
  - Check that paths resolve correctly

### Step 4: Makefile Target Testing

- [ ] Test Makefile.alpha targets can find configs:
  ```bash
  ssh alpha-srv
  cd /opt/podverse
  make -f Makefile.alpha alpha_validate_init
  # Should verify all config files exist at new paths
  ```

- [ ] Test a service deployment:
  ```bash
  # On alpha-srv:
  ssh alpha-srv
  cd /opt/podverse
  make -f Makefile.alpha alpha_api_up
  # Should start API using configs from /opt/podverse/infra/config/alpha/
  ```

## Full Deployment Test

### Step 5: End-to-End Deployment

- [ ] Run full alpha deployment via Jenkins:
  - Execute `alpha_deploy_all` pipeline
  - Monitor logs for any path-related errors
  - Verify all services start successfully

- [ ] Verify services are running:
  ```bash
  # On alpha-srv
  docker ps | grep podverse-api
  docker ps | grep podverse-web
  
  # On alpha-aux
  docker ps | grep podverse-db
  docker ps | grep podverse-mq
  docker ps | grep podverse-workers
  ```

- [ ] Test API endpoints:
  ```bash
  curl https://api.alpha.podverse.fm/health
  curl https://alpha.podverse.fm
  ```

### Step 6: Verify No Production Impact

- [ ] Confirm production/sandbox unchanged:
  ```bash
  # Production should still use /opt/podverse-ops
  ssh prod-srv
  ls -la /opt/podverse-ops  # Should exist
  ls -la /opt/podverse      # Should NOT exist (or be different)
  ```

- [ ] Verify production playbooks unchanged:
  ```bash
  cd podverse-ansible
  grep -r "podverse_monorepo" podverse-prod-*.yaml
  # Should return no results
  ```

## Rollback Plan

If issues are discovered:

- [ ] Revert alpha playbooks to use `podverse_ops` role
- [ ] Revert alpha config roles to deploy to `/opt/podverse-ops/config/`
- [ ] Move role files back to old hierarchy
- [ ] Update Jenkins jobs to use `podverse-ops` repo

## Success Criteria

All of the following must pass:

- ✅ Ansible playbooks deploy successfully
- ✅ Sparse checkout works correctly
- ✅ Config files land at `/opt/podverse/infra/config/alpha/`
- ✅ Jenkins pipelines can access all required files
- ✅ Makefile targets work with new paths
- ✅ All services start and run correctly
- ✅ No production/sandbox environments affected
- ✅ No `podverse-ops` references in alpha code paths

## Notes

- This migration is **alpha-only** - production and sandbox continue using `podverse-ops`
- The `podverse_ops` role remains unchanged for production/sandbox compatibility
- All alpha-specific paths are under `/opt/podverse/infra/config/alpha/` to avoid conflicts

# Plan 02 - Jenkins Pipeline Path Updates

## Objective

Ensure all Jenkinsfiles in the monorepo reference the monorepo paths and infra layout, and remove any remaining `podverse-ops` assumptions.

## Key Files

- Jenkinsfiles: [`/Users/mitcheldowney/repos/podverse/pipelines/jenkins/alpha/`](/Users/mitcheldowney/repos/podverse/pipelines/jenkins/alpha/)

## Example of Desired Path Usage

```41:72:/Users/mitcheldowney/repos/podverse/pipelines/jenkins/alpha/Jenkinsfile.srv_api_up
                    dir('/opt/podverse/infra/docker/alpha/api') {
                        def apiVersion
                        if (params.IMAGE_VERSION == 'alpha') {
                            apiVersion = sh(script: '/opt/podverse/scripts/ghcr/getLatestAlphaTag.sh', returnStdout: true).trim()
                            if (!apiVersion) {
                                error('ERROR: No alpha tag found from getLatestAlphaTag.sh')
                            }
                        } else {
                            apiVersion = params.IMAGE_VERSION
                        }
                        sh '''#!/bin/bash
                            set -euo pipefail
                            sed -e "s|REPLACE_WITH_API_VERSION|''' + apiVersion + '''|g" docker-compose.yml.template > docker-compose.yml
                        '''
                    }
```

## Steps

- Audit all Jenkinsfiles in `pipelines/jenkins/alpha/` for any remaining legacy paths:
  - `/opt/podverse-ops`
  - `docker-compose/alpha/...` (legacy root)
  - `config/` (legacy root)
  - `scripts/` pointing to old repo location
- Update paths to monorepo locations:
  - `infra/docker/alpha/...`
  - `infra/config/alpha/...`
  - `scripts/ghcr/...`
  - `Makefile.alpha` targets run from `/opt/podverse`
- Verify any templating logic aligns with monorepo templates:
  - `infra/docker/alpha/*/docker-compose.yml.template`
- Ensure any pipelines that used `podverse-ops` git pulls or scripts now target the monorepo repo and paths.
- Scope guard: only alpha Jenkinsfiles should change (avoid touching legacy prod pipelines).
- If alpha pipelines need new files to avoid sandbox/legacy overlap, create alpha-specific files and update references accordingly.

## Validation

- Run a representative set of pipelines:
  - `srv_api_up`, `srv_web_up`, `aux_db_up`, `aux_workers_pull`
- Confirm each pipeline can find all referenced files inside `/opt/podverse` with sparse checkout enabled.

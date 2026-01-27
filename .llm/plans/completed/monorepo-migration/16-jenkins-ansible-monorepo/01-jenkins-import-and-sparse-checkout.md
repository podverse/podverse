# Plan 01 - Jenkins Import + Sparse Checkout

## Objective

Update Jenkins job definitions to pull the monorepo with sparse checkout, so only deployment-related directories are retrieved.

## Key Files

- Jenkins job template: [`/Users/mitcheldowney/repos/podverse/pipelines/jenkins/alpha/scm-job.xml`](/Users/mitcheldowney/repos/podverse/pipelines/jenkins/alpha/scm-job.xml)
- Import script: [`/Users/mitcheldowney/repos/podverse/pipelines/jenkins/alpha/import.sh`](/Users/mitcheldowney/repos/podverse/pipelines/jenkins/alpha/import.sh)

## Current SCM Template (reference)

```6:25:/Users/mitcheldowney/repos/podverse/pipelines/jenkins/alpha/scm-job.xml
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition" plugin="workflow-cps">
    <scm class="hudson.plugins.git.GitSCM" plugin="git">
      <configVersion>2</configVersion>
      <userRemoteConfigs>
        <hudson.plugins.git.UserRemoteConfig>
          <url>https://github.com/podverse/podverse.git</url>
          <credentialsId>d793d818-3df6-4f30-b137-c849b43ce6fe</credentialsId>
        </hudson.plugins.git.UserRemoteConfig>
      </userRemoteConfigs>
      <branches>
        <hudson.plugins.git.BranchSpec>
          <name>*/v5-develop</name>
        </hudson.plugins.git.BranchSpec>
      </branches>
      <extensions/>
    </scm>
    <scriptPath>REPLACE_SCRIPT_PATH</scriptPath>
    <lightweight>true</lightweight>
  </definition>
```

## Steps

- Add a Jenkins Git SCM extension for sparse checkout in `scm-job.xml`.
  - Use `SparseCheckoutPaths` and list only what Jenkins needs, for example:
    - `pipelines/jenkins/`
    - `infra/docker/`
    - `infra/config/`
    - `scripts/`
    - `Makefile`
    - `Makefile.alpha`
  - Consider adding `CleanBeforeCheckout` to avoid stale files.
- Decide whether to set `<lightweight>false</lightweight>` if Jenkins is not performing a full checkout for pipeline steps. If jobs rely on workspace files (Makefile/scripts), disable lightweight checkout.
- If job folder names or branch names change for monorepo, update in `scm-job.xml` and confirm `import.sh` still discovers the Jenkinsfiles in `pipelines/jenkins/alpha/`.
- Scope guard: only update alpha Jenkins job definitions.

## Validation

- Import jobs with `import.sh` and confirm Jenkins workspaces only contain the sparse set.
- Run one pipeline (e.g., `srv_api_up`) and verify it can access:
  - `infra/docker/alpha/...`
  - `scripts/ghcr/getLatestAlphaTag.sh`
  - `Makefile.alpha`

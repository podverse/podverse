# Secret generators (`infra/k8s/scripts/secret-generators`)

SOPS-encrypted Kubernetes **Secret** manifests for Podverse workloads. Run these from the **monorepo root** (default output paths are repo-root **`./secrets/…`**, the same pattern GitOps repos use; paths are relative to the current working directory).

## Management DB secret

```bash
bash ./infra/k8s/scripts/secret-generators/create_management_db_secret.sh
```

## Run all auto-gen scripts

```bash
bash ./infra/k8s/scripts/secret-generators/create_all_secrets_auto_gen.sh alpha
```

This runs the following with `--auto-gen`:

- `create_api_secret.sh`
- `create_management_api_secret.sh`
- `create_db_secret.sh`
- `create_management_db_secret.sh`
- `create_keyvaldb_secret.sh`
- `create_mq_secret.sh`
- `create_workers_add_by_rss_secret.sh`
- `create_workers_webpush_secret.sh` (VAPID key pair via `npx` + `web-push`; see below)

## Always-present keys (may be empty)

Generated **API** and **add-by-RSS workers** encrypted Secrets keep a stable key set so `sops edit` always shows the same knobs, even when values are blank until you set them.

- **`create_api_secret.sh` → `podverse-*-api-opaque.enc.yaml`**: includes `METABOOST_SIGNING_KEY_PEM` and `METABOOST_APP_ASSERTION_ISS` (optional at runtime; auto-gen leaves them empty). Set both or neither when enabling AppAssertion minting.
- **`create_workers_add_by_rss_secret.sh` → `podverse-*-workers-add-by-rss-opaque.enc.yaml`**: always includes `ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY`. Interactive mode allows an empty placeholder; the API still requires a valid 64-hex key before a healthy start if that env is required by your config.
- **`create_workers_webpush_secret.sh` → `podverse-*-workers-webpush-opaque.enc.yaml`**: with `--auto-gen` (or interactive: choose to generate a new pair), generates a VAPID keypair, writes the **private** key to the SOPS-encrypted Secret, and updates the **public** VAPID lines in place when the repo is laid out for it:
  - monorepo: `infra/k8s/base/workers/source/workers.env` (`WEBPUSH_VAPID_PUBLIC_KEY`) and `infra/k8s/base/web/source/web-sidecar.env` (`NEXT_PUBLIC_WEBPUSH_VAPID_PUBLIC_KEY`)
  - GitOps repo: `apps/podverse-<env>/workers/...` and `apps/podverse-<env>/web/...` for the same two keys
  - If those paths are missing, only the secret file is written; you must set public keys in ConfigMap / `NEXT_PUBLIC_*` to match. **`WEBPUSH_VAPID_SUBJECT`** (e.g. `mailto:…`) is never changed by the script. Re-running generation **rotates** the VAPID pair; keep the SOPS file and the two public env files in a single commit.

**Existing** `*.enc.yaml` files from before these keys existed: add the missing keys with empty values in `sops` (or decrypt → edit `stringData` / `data` → re-encrypt) instead of re-running a generator from scratch if you need to preserve other material.

## Secrets that require external inputs

These **do not** support `--auto-gen` and are **not** in the bulk runner. Run manually when credentials are available:

- `create_api.podcastindex.org_secret.sh` — Podcast Index API keys
- `create_firebase_secret.sh` — `firebase-key.json` file
- `create_workers_digital_ocean_secret.sh` — DigitalOcean Spaces access/secret keys

## GitHub Container Registry pull secret (GHCR)

For clusters that pull **ghcr.io** images with `imagePullSecrets`, generate an encrypted docker-registry Secret (interactive: GitHub username, PAT with `read:packages`, target namespace for the **Kubernetes** Secret). Default output on disk: **`secrets/github-registry-secret.enc.yaml`** at the GitOps repo root (override with **`--output-file`** if you need a different path).

```bash
bash ./infra/k8s/scripts/secret-generators/create_github_registry_secret.sh
# Optional:
# bash ./infra/k8s/scripts/secret-generators/create_github_registry_secret.sh \
#   --output-file ./secrets/custom-path/github-registry-secret.enc.yaml
```

GitOps repositories usually **copy** these scripts; default output paths already match repo-root **`./secrets/…`**.

If you still have an older layout at **`secrets/<namespace>/github-registry-secret.enc.yaml`**, either move it to **`secrets/github-registry-secret.enc.yaml`** or keep using **`--output-file`** with the previous path until you migrate.

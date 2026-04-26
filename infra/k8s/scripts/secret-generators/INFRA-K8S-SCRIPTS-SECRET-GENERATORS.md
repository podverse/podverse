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

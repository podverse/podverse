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

- `create_api_secret.sh` ( **`AUTH_JWT_SECRET`** only)
- `create_mailer_secret.sh` → Secret **`podverse-mailer-opaque`** (`MAILER_USERNAME`, `MAILER_PASSWORD`)
- `create_metaboost_secret.sh` → Secret **`podverse-metaboost-opaque`** (`METABOOST_SIGNING_KEY_PEM`, `METABOOST_APP_ASSERTION_ISS`)
- `create_management_api_secret.sh`
- `create_db_secret.sh`
- `create_management_db_secret.sh`
- `create_keyvaldb_secret.sh`
- `create_mq_secret.sh`
- `create_workers_add_by_rss_secret.sh`
- `create_workers_webpush_secret.sh` (VAPID key pair via `npx` + `web-push`; see below)

The API **`Deployment`** references **`podverse-api-opaque`**, **`podverse-mailer-opaque`**, **`podverse-workers-webpush-opaque`**, and **`podverse-metaboost-opaque`** via **`secretRef`**. **`podverse-mailer-opaque`** and **`podverse-workers-webpush-opaque`** use **`optional: true`** so the API can schedule without those Secrets when mailer and Web Push are not used (see `infra/k8s/base/api/deployment.yaml`).

## Mailer and Metaboost secrets (interactive)

After auto-gen, mail and Metaboost keys are empty until you run the matching generator **without** `--auto-gen`:

```bash
bash ./infra/k8s/scripts/secret-generators/create_mailer_secret.sh alpha
bash ./infra/k8s/scripts/secret-generators/create_metaboost_secret.sh alpha
```

GitOps checkout: **`./scripts/secret-generators/<script>.sh`**. **`create_metaboost_secret.sh`** prompts for issuer text and a **filesystem path** to the PEM file.

## Always-present keys (may be empty)

Generated **API-related** and **add-by-RSS workers** encrypted Secrets keep a stable key set so optional fields exist even when blank until you set them.

- **`create_api_secret.sh` → `podverse-*-api-opaque.enc.yaml`**: **`AUTH_JWT_SECRET`** only.
- **`create_mailer_secret.sh` → `podverse-*-mailer-opaque.enc.yaml`**: **`MAILER_USERNAME`** / **`MAILER_PASSWORD`** (optional at runtime; auto-gen leaves empty).
- **`create_metaboost_secret.sh` → `podverse-*-metaboost-opaque.enc.yaml`**: **`METABOOST_SIGNING_KEY_PEM`** and **`METABOOST_APP_ASSERTION_ISS`** (optional; set both or neither at runtime for App Assertion minting).
- **`create_workers_add_by_rss_secret.sh` → `podverse-*-workers-add-by-rss-opaque.enc.yaml`**: always includes `ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY`. Interactive mode allows an empty placeholder; the API still requires a valid 64-hex key before a healthy start if that env is required by your config.
- **`create_workers_webpush_secret.sh` → `podverse-*-workers-webpush-opaque.enc.yaml`**: the encrypted Secret contains **only** `WEBPUSH_VAPID_PRIVATE_KEY`. With `--auto-gen` (or interactive: generate a new pair), the script creates a VAPID pair, writes the private key to the SOPS file, and writes the **paired** public key to source env when the repo is laid out for it:
  - monorepo: `infra/k8s/base/workers/source/workers.env` (`WEBPUSH_VAPID_PUBLIC_KEY`) and `infra/k8s/base/web/source/web-sidecar.env` (`NEXT_PUBLIC_WEBPUSH_VAPID_PUBLIC_KEY`)
  - GitOps repo: `apps/podverse-<env>/workers/...` and `apps/podverse-<env>/web/...` for the same two keys
  - If those paths are missing, the script still prints the same public key for copy-paste. Re-running generation **rotates** the VAPID pair; keep the SOPS file and the two public env files in a single commit.
- **`WEBPUSH_VAPID_SUBJECT`** (e.g. `mailto:ops@example.com`): set in `infra/k8s/base/workers/source/workers.env` or `apps/podverse-<env>/workers/source/workers.env` (GitOps), and the same in `infra/k8s/base/api/source/api.env` or `apps/podverse-<env>/api/source/api.env` for the API. Local: `apps/workers/.env` and `apps/api/.env`. See `apps/workers/ENV.md` and `apps/api/ENV.md`.

**Migrating from a single `podverse-*-api-opaque` that mixed JWT + mailer + Metaboost:** generate the two new encrypted files with **`create_mailer_secret.sh`** and **`create_metaboost_secret.sh`**, apply them, then replace **`podverse-*-api-opaque.enc.yaml`** with a **`create_api_secret.sh`** run that contains **only** **`AUTH_JWT_SECRET`** (preserve the existing JWT value when re-running interactively). Remove duplicate keys from the old api-opaque Secret so env vars are not defined twice.

**Existing** `*.enc.yaml` files from before these keys existed: prefer re-running the appropriate **`create_*`** script so values stay under correct **`kubectl`** encoding; only fall back to manual YAML edits if you have no other option.

## Secrets that require external inputs

These **do not** support `--auto-gen` and are **not** in the bulk runner. `create_all_secrets_auto_gen.sh` lists these—along with mailer and Metaboost for credential follow-up—at the end. Run manually when credentials are available:

- `create_api.podcastindex.org_secret.sh` — Podcast Index API keys
- `create_cloudflare_api_token_secret.sh` — Cloudflare API token for cert-manager DNS01 challenges (`cloudflare-api-token-secret` in `cert-manager` namespace, key `api-token`). Create the token in Cloudflare with `Zone - DNS - Edit` and `Zone - Zone - Read`, scoped only to the required zones.
- `create_cloudflared_tunnel_secret.sh` — Cloudflare **Tunnel** token for **cloudflared** (`cloudflared-tunnel-secret` in **`external-infra`** namespace, key **`tunnel-token`**). Token from Zero Trust → **Networks** → **Tunnels** → your tunnel → copy token. Optional **`--output-file`** for a non-default path (default **`./secrets/cloudflared-tunnel-secret.enc.yaml`**).
- `create_firebase_secret.sh` — `firebase-key.json` from your machine; produces **Secret `podverse-workers-firebase-opaque`** with a single key `firebase-key.json`. Base `infra/k8s` **API, workers, and workers CronJob** pods mount it read-only at **`/var/secrets/firebase`**, matching **`GOOGLE_FIREBASE_ADMIN_JSON_KEY_PATH=/var/secrets/firebase/firebase-key.json`** in the workers and API `*.env` sources. Apply the encrypted manifest after SOPS, then set **`GOOGLE_FIREBASE_NOTIFICATIONS_ENABLED=true`** when you want FCM/notification features on.
- `create_workers_storage_bucket_secret.sh` — **generic** S3-compatible bucket credentials (`BUCKET_ACCESS_KEY`, `BUCKET_SECRET_KEY`). Output Secret **`podverse-workers-storage-bucket-opaque`** (same for Garage, DigitalOcean Spaces, AWS, B2, etc.). Non-secret bucket env (`BUCKET_PROVIDER`, `BUCKET_REGION`, `BUCKET_ENDPOINT`, …) lives in the workers ConfigMap — see **`docs/image-shrinking/BUCKET-PROVIDERS.md`**. If you previously used **`podverse-workers-garage-opaque`** or **`podverse-workers-digital-ocean-opaque`**, regenerate with this script and retire the old Secret names (see **`infra/k8s/INFRA-K8S.md`**).
- `create_github_registry_secret.sh` — GitHub username + PAT (`read:packages`) for **ghcr.io** image pulls; see the subsection below

### Cloudflare Tunnel (cloudflared)

```bash
bash ./infra/k8s/scripts/secret-generators/create_cloudflared_tunnel_secret.sh
```

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

## Argo CD GitHub repository credentials (private clone)

For Argo CD to clone **private GitHub** GitOps repos over HTTPS, register a repository `Secret` in the **`argocd`** namespace (label **`argocd.argoproj.io/secret-type: repository`**). **`create_argocd_github_repo_secret.sh`** interactively builds that manifest and SOPS-encrypts it under **`./secrets/`**. Run from your **GitOps repository root** (next to **`.sops.yaml`**). Not part of **`create_all_secrets_auto_gen.sh`**.

**Naming:** accept script defaults for consistency across repos: Kubernetes Secret **`<slug>-repo-creds`**, file **`./secrets/<slug>-argoc-repo.enc.yaml`**, where **`<slug>`** is derived from the `github.com/org/repo` path (same idea for every private GitOps URL). Older fixed names (e.g. `github-repo-creds`) can be retired after you apply the new Secret and confirm sync; see your GitOps repo’s `scripts/README.md` if maintained there.

```bash
bash ./infra/k8s/scripts/secret-generators/create_argocd_github_repo_secret.sh
# GitOps checkout:
bash ./scripts/secret-generators/create_argocd_github_repo_secret.sh
```

The same script may be copied into other application or GitOps repositories for discoverability (forks are not required to use Podverse-only paths).

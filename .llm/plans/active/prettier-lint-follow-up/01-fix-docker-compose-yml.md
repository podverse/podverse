# 01 – Fix docker-compose.yml Duplicate Keys

The `podverse_jenkins_docker` service in [infra/docker/ci/docker-compose.yml](../../../../infra/docker/ci/docker-compose.yml) has two `environment:` blocks (lines 62–63 and 64–68). YAML map keys must be unique, so the file is invalid and Prettier fails. It was added to [.prettierignore](../../../../.prettierignore) as a workaround.

## 1. Merge duplicate `environment` blocks

In `infra/docker/ci/docker-compose.yml`, under `podverse_jenkins_docker`:

- **Current** (invalid):

  ```yaml
    environment:
      DOCKER_TLS_CERTDIR: "/certs"
    environment:
      VIRTUAL_HOST:
      VIRTUAL_PORT: 3000
      LETSENCRYPT_HOST:
      LETSENCRYPT_EMAIL:
  ```

- **Fix**: Use a single `environment:` block with all keys:
  ```yaml
  environment:
    DOCKER_TLS_CERTDIR: '/certs'
    VIRTUAL_HOST:
    VIRTUAL_PORT: 3000
    LETSENCRYPT_HOST:
    LETSENCRYPT_EMAIL:
  ```

## 2. Remove from .prettierignore

In [.prettierignore](../../../../.prettierignore), delete the line:

```
infra/docker/ci/docker-compose.yml
```

and the comment above it (`# Pre-existing invalid YAML (duplicate keys)`), since the file will no longer be invalid.

## 3. Format and verify

- Run `npx prettier --write infra/docker/ci/docker-compose.yml`.
- Run `npm run prettier:check` – should pass.
- Run `npm run lint` – should still pass.

## Verification

- `prettier --check .` passes.
- `docker compose -f infra/docker/ci/docker-compose.yml config` (or equivalent) validates the YAML if you use it locally.

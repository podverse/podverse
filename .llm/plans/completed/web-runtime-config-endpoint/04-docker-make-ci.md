# Subplan 04 - Docker, Make, and CI

## Objective

Stop baking `.env.production` into app images and introduce a **sidecar image**
that reads `.env.production` at runtime. Align CI/Make targets with this flow.

## Tasks

1. Update app Dockerfiles to avoid copying env files into the app image.
2. Add a new sidecar Dockerfile (node-tiny service) for web + management-web.
3. Ensure runtime expects `.env.production` mounted into the sidecar container.
4. Update Makefile targets that set `ENV_FILE` for build-time usage.
5. Adjust CI workflow steps that currently depend on `alpha.env` at build time.

## Target Files (expected)

- `apps/web/Dockerfile`
- `apps/management-web/Dockerfile`
- `apps/web/sidecar/Dockerfile` (new)
- `apps/management-web/sidecar/Dockerfile` (new)
- `Makefile.alpha`
- `.github/workflows/publish-alpha.yml`

## Notes

- Keep Docker build reproducible without secrets.
- Sidecar image should be minimal (node-alpine) and internal-only.
- Document any remaining minimal build-time envs if required.

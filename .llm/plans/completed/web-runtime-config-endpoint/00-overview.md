# Web Runtime Config Endpoint Plan - Overview

## Goal

Enable a build-once Next.js image that reads all `NEXT_PUBLIC_*` values at runtime
via an internal **sidecar service**, so deployers can provide `.env.production`
during deploy without exposing a public config endpoint.

## Scope

- apps/web and apps/management-web
- All `NEXT_PUBLIC_*` env values currently used in client code
- Validation adjustments, Docker/Make/CI, Ansible/K8s, and docs

## Deployment Choice and Tradeoffs

- Use a **sidecar service** (tiny Node service) inside the same pod/task as the app.
- The app fetches config from the sidecar over `localhost` (K8s) or service name
  (Docker Compose), so the endpoint is not publicly reachable.
- Tradeoffs:
  - **Pros**: internal-only access, no public endpoint, runtime env still supported
  - **Cons**: extra container to run and maintain, needs deploy/compose updates

## Assumptions

- Images are pre-built; deployers supply `.env.production` at runtime
- Runtime endpoint can be hit early in app bootstrap (server-side fetch)
- SSR can read runtime config without relying on build-time envs
- Avoid default values for env vars; require explicit configuration before running

## Subplans

- [01-runtime-config-contract.md](01-runtime-config-contract.md)
- [02-endpoint-bootstrap.md](02-endpoint-bootstrap.md)
- [03-validation-updates.md](03-validation-updates.md)
- [04-docker-make-ci.md](04-docker-make-ci.md)
- [05-infra-ansible-k8s.md](05-infra-ansible-k8s.md)
- [06-docs.md](06-docs.md)
- [EXECUTION.md](EXECUTION.md)

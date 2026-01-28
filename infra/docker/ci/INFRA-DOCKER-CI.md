# CI Docker Infrastructure

The CI/CD infrastructure (Jenkins setup with nginx proxy and Let's Encrypt) has **not** been migrated to this directory.

## Reasoning

The CI docker-compose.yml from podverse-ops contains:

- nginx reverse proxy (jwilder/nginx-proxy)
- Let's Encrypt SSL companion
- Jenkins Docker-in-Docker container
- Jenkins admin container

This is server infrastructure setup rather than application-level Docker configuration. It's more appropriate for:

- **podverse-ansible** - Infrastructure provisioning and configuration management
- Or a dedicated **infrastructure repository** if CI/CD needs are complex

## Location

The original file can be found at:

- `podverse-ops/docker-compose/ci/docker-compose.yml`

## Migration Decision

When ready to migrate CI infrastructure, consider:

1. Moving to podverse-ansible with proper Ansible playbooks
2. Using cloud-native CI/CD (GitHub Actions, GitLab CI, etc.)
3. Keeping as a separate infrastructure concern outside the monorepo

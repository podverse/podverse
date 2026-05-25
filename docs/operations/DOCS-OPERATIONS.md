# Operations documentation

Operator and platform runbooks for Podverse deployments, data stores, and platform capabilities.

## Database

| Doc                                                                                       | Purpose                                              |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| [DB-MIGRATIONS.md](database/DB-MIGRATIONS.md)                                             | Forward-only SQL migrations and ops jobs             |
| [LINEAR-MIGRATIONS.md](database/LINEAR-MIGRATIONS.md)                                     | Linear migration contract, `0003a`/`0003b` baselines |
| [DB-USERS.md](database/DB-USERS.md)                                                       | Postgres roles and bootstrap grants                  |
| [MANAGEMENT-DATABASE-CONSOLE.md](database/MANAGEMENT-DATABASE-CONSOLE.md)                 | Management-web database console                      |
| [MANAGEMENT-DATABASE-CONSOLE-ROLLOUT.md](database/MANAGEMENT-DATABASE-CONSOLE-ROLLOUT.md) | Console rollout checklist                            |

## Platform capabilities

| Doc                                                                 | Purpose                                                               |
| ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [DOCS-OPERATIONS-PLATFORM.md](platform/DOCS-OPERATIONS-PLATFORM.md) | Platform capabilities index (Observability, Integrations, Extensions) |

### Observability

| Doc                                    | Purpose                                    |
| -------------------------------------- | ------------------------------------------ |
| [TRACING.md](observability/TRACING.md) | Always-on tracing and optional OTLP export |

### Integrations

| Doc                                                     | Purpose                                      |
| ------------------------------------------------------- | -------------------------------------------- |
| [INTEGRATIONS-WEB.md](integrations/INTEGRATIONS-WEB.md) | Built-in web integrations (Cloudflare first) |

### Extensions

| Doc                                                                           | Purpose                                      |
| ----------------------------------------------------------------------------- | -------------------------------------------- |
| [EXTENSIONS-SIDECAR.md](extensions/EXTENSIONS-SIDECAR.md)                     | Extension sidecars (Prometheus, metrics SDK) |
| [PROMETHEUS-METRICS-ENDPOINTS.md](extensions/PROMETHEUS-METRICS-ENDPOINTS.md) | Scrape paths, ports, Prometheus jobs         |

## Deploy and release

| Doc                                               | Purpose                                    |
| ------------------------------------------------- | ------------------------------------------ |
| [ALPHA-DEPLOYMENT.md](deploy/ALPHA-DEPLOYMENT.md) | Alpha/preprod Docker, CI, and local deploy |
| [PUBLISH.md](deploy/PUBLISH.md)                   | Staging builds, main promotion, GHCR tags  |
| [SECRETS.md](deploy/SECRETS.md)                   | Repository and deployment secrets          |

## Related

- [Remote Kubernetes (GitOps)](../development/k8s/REMOTE-K8S-GITOPS.md)
- [INFRA-K8S.md](../../infra/k8s/INFRA-K8S.md)

# version-all-api-routes

**Started:** 2026-05-03  
**Author:** Developer + Agent  
**Context:** Version all API routes — Podverse main API health under `/api/v2`, unversioned `GET /` → 404 JSON; K8s probes; Metaboost root 404 + Swagger under version path.

### Session 1 - 2026-05-03

#### Prompt (Developer)

Version all API routes (Podverse + Metaboost)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Podverse main API: `registerHealthRoutes(app, baseUrl)` registers `/api/v2/health` and `/api/v2/health/ready`; unversioned `GET /` returns `404` with `{ message: 'Not found' }`.
- K8s probes: readiness `/api/v2/health/ready`, liveness `/api/v2/health`; alpha kustomization comment updated.
- Integration tests use `config.api.prefix` + `config.api.version` for health URLs and assert unversioned `/` is 404.

#### Files Modified

- apps/api/src/lib/health/registerHealthRoutes.ts
- apps/api/src/app.ts
- infra/k8s/base/api/deployment.yaml
- infra/k8s/alpha/api/kustomization.yaml
- apps/api/src/test/health-ready.test.ts
- .llm/history/active/version-all-api-routes/version-all-api-routes-part-01.md

### Session 2 - 2026-05-03

#### Prompt (Developer)

@podverse/apps/api/src/app.ts:48-50 even though the root / path in all of our apis and mgmt apis should not be used for readiness checks (we want to use versioned paths for that) we want to keep the root path functional with a basic success response. it should also be above all the route registrations including the health checks. we won't use this root / for anything meaningful, but devs may want to visit this root for a manual status check

#### Key Decisions

- Unversioned `GET /` returns `200` with `{ status: 'ok', message: 'API is online' }` on main API and `{ status: 'ok', message: 'Management API is online' }` on management-api; registered **before** `registerHealthRoutes` / versioned routes (and before other route wiring in `startApp`).
- K8s probes remain on versioned health paths only.

#### Files Modified

- apps/api/src/app.ts
- apps/management-api/src/app.ts
- apps/api/src/test/health-ready.test.ts
- apps/management-api/src/routes/auth.integration.test.ts
- .llm/history/active/version-all-api-routes/version-all-api-routes-part-01.md

### Session 1 - 2026-04-21

#### Prompt (Developer)

Read and execute:
/Users/mitcheldowney/repos/pv/podverse/.llm/plans/completed/podverse-security-remediation-wave-1/04-auth-token-policy.md

Implement exactly what the plan specifies, including tests and verification commands.
Do not edit plan markdown files.

#### Key Decisions

- Introduced **`jwtExpiresInToMilliseconds`** in `@podverse/helpers` time constants (supports `Nd/Nh/Nm/Ns`, plain seconds, fallback **7d**) and wired **cookie `maxAge`** to the same TTL as JWT for both APIs.
- **Public API**: default JWT/cookie TTL **`AUTH_JWT_EXPIRES_IN`** = **`7d`** when unset; **`AUTH_ALLOW_TOKEN_IN_RESPONSE_BODY`** defaults **false** — login JSON omits `token` unless env is true **and** client sends **`includeTokenInResponseBody`** (truthy).
- **Management API**: default JWT/cookie TTL **`1d`** when unset; same token-body gate as API.
- Startup validation lists optional **`AUTH_JWT_EXPIRES_IN`** and **`AUTH_ALLOW_TOKEN_IN_RESPONSE_BODY`** for both apps.
- Added **`apps/api`** Vitest (`authPolicy.test.ts`) alongside existing management-api tests; migration notes in auth module file headers.

#### Files Modified

- packages/helpers/src/lib/timeConstants.ts
- apps/api/src/config/index.ts
- apps/api/src/lib/auth/index.ts
- apps/api/src/lib/startup/validation.ts
- apps/api/src/lib/auth/authPolicy.test.ts (new)
- apps/api/package.json
- apps/api/tsconfig.json
- apps/api/vitest.config.ts (new)
- apps/management-api/src/config/index.ts
- apps/management-api/src/lib/auth/index.ts
- apps/management-api/src/lib/startup/validation.ts
- apps/management-api/src/lib/auth/authPolicy.test.ts (new)
- package-lock.json

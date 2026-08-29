# 076-e2e-api-mobile-profile

**Master step:** 5.17
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Add `apiMobileE2e` profile to
  [`podverseTestEnv.ts`](/packages/helpers-config/src/podverseTestEnv.ts).
- Use a **dedicated** API port (locked: **4230**), not Playwright web `4030` or management
  `4130`.
- Same Postgres/Valkey as other test profiles (`5732` / `6679`, `podverse_app_test`).
- Export helpers so scripts can start API with `PODVERSE_SKIP_DOTENV` + this profile.

## Locked decisions

| Item                     | Value                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------ |
| Profile name             | `apiMobileE2e`                                                                       |
| `API_PORT` / public base | `4230` / `http://localhost:4230`                                                     |
| DB / Valkey              | Reuse `apiTestEnvBase` (5732 / 6679)                                                 |
| CORS                     | Allow mobile E2E origins as needed for health; prefer permissive local test origins  |
| Signup mode              | Match web E2E seed compatibility (`admin_only_email` unless seed requires otherwise) |

## Acceptance criteria

- `PodverseApiTestEnvProfile` includes `apiMobileE2e`
- Unit or type check covers the new profile key
- [TEST-ENV.md](/apps/mobile/e2e/TEST-ENV.md) documents port **4230** as the mobile E2E API URL

## Web parity references

- `apiWebE2e` @ 4030 in `podverseTestEnv.ts`
- [069-e2e-test-env-doc](/docs/proposals/mobile/_master-plan_/phase-1/details/069-e2e-test-env-doc.md)
  (doc-only predecessor)

## Verification

```bash
rg -n 'apiMobileE2e|4230' packages/helpers-config/src/podverseTestEnv.ts apps/mobile/e2e/TEST-ENV.md
```

## Depends on

- 5.10 / 069 done (conceptual TEST-ENV)

## Blocks

- 5.18–5.20, 6.11, 6.12

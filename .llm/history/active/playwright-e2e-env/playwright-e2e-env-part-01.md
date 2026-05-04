# Playwright E2E server env (API_RELEASE / USER_AGENT)

Started: 2026-05-03
Author: Agent
Context: Playwright webServer failed to start apps/api and management-api during `npm test` → `test:e2e:web`.

---

### Session 1 - 2026-05-03

#### Prompt (Developer)

@/Users/mitcheldowney/.cursor/projects/Users-mitcheldowney-repos-pv-podverse-ansible/terminals/14.txt:7-1066 debug

#### Key Decisions

- **Cause:** `validateStartupRequirements` in `apps/api` and `apps/management-api` requires `API_RELEASE` and `USER_AGENT`. Playwright `webServer` commands prefix env via `apps/web/playwright.e2e-server-env.ts` and `apps/management-web/playwright.config.ts` but those vars were omitted, so `npm run start` exited before binding ports.
- **Fix:** Set `API_RELEASE=test-release` and `USER_AGENT=Example Bot test/API/5` (same as `apps/api/src/test/setup.ts`) in both E2E API env blocks.

#### Files Modified

- `apps/web/playwright.e2e-server-env.ts` — `buildE2eWebApiEnvPrefix`
- `apps/management-web/playwright.config.ts` — `MANAGEMENT_API_ENV`

#### Follow-up (same session)

- **USER_AGENT:** Shell env prefix must quote values with spaces (`USER_AGENT="Example Bot test/API/5"`), or `sh` treats `Bot` as a command (`command not found: Bot`).
- **feed-operations-flag-status E2E:** Route mock `**/feed-operations/flag-status` intercepted the Next.js **page** GET as well as the API POST; narrowed to `**/api/v2/feed-operations/flag-status`.

#### Files Modified (follow-up)

- `apps/management-web/e2e/feed-operations-flag-status.spec.ts` — API-only route pattern

#### Follow-up 2

- **Strict locator:** `getByText('Spam item limit override')` matched both `<dt>` and the label substring; removed redundant assertion.
- **Spam override input:** `getByRole('spinbutton', { name: '…' })` failed when label/input were not associated; use `input[name="spam-item-limit-override"]`.

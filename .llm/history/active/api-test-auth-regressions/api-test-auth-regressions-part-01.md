### Session 5 - 2026-04-28

#### Prompt (Developer)

@/Users/mitcheldowney/.cursor/projects/Users-mitcheldowney-repos-pv-podverse-ansible/terminals/9.txt:7-329 debug

#### Key Decisions

- **`queue.test.ts`** clip chain sometimes failed **`POST .../between`** with **401** (expected **201**): `AccountService#get` is shared via **`getAccountMock`** with many **`mockResolvedValueOnce`** calls; **leftover once-queue entries** can make a later `get` return **`undefined`**, so **`verifyTokenAndMembership`** returns **401**.
- Fix: top-level **`beforeEach(() => getAccountMock.mockReset())`** in **`describe('queue routes')`** to clear once-queues and restore the hoisted default **`get`** implementation; removed redundant **`mockImplementation`** blocks in multi-step status tests (same shape as default).

#### Files Modified

- apps/api/src/test/queue.test.ts
- .llm/history/active/api-test-auth-regressions/api-test-auth-regressions-part-01.md

### Session 4 - 2026-04-28

#### Prompt (Developer)

@/Users/mitcheldowney/.cursor/projects/Users-mitcheldowney-repos-pv-podverse-ansible/terminals/9.txt:7-1066 debug

#### Key Decisions

- Management-web **`workers-page`** E2E failed because **`mqRSSAdd`** sits inside a **collapsed** `<details>` (Disclosure); Playwright reported **hidden** though the node existed.
- **`getByRole('button', { name: 'Message queue' })`** timed out: async command load + **`summary`** not matched as that role reliably.
- Fix: **`page.locator('summary').filter({ hasText: /^Message queue$/ })`**, **`expect(...).toBeVisible({ timeout: 15_000 })`**, then **`click()`**; **`test.setTimeout(30_000)`** so cold builds fit Playwright’s **10s** default.

#### Files Modified

- apps/management-web/e2e/workers-page.spec.ts
- .llm/history/active/api-test-auth-regressions/api-test-auth-regressions-part-01.md

### Session 3 - 2026-04-28

#### Prompt (Developer)

@/Users/mitcheldowney/.cursor/projects/Users-mitcheldowney-repos-pv-podverse-ansible/terminals/9.txt:7-1026 debug

#### Key Decisions

- Full `npm run test` failed in **`test:e2e:web`** because Playwright’s management-web **webServer** runs **`npm run build`** on **management-api**, which runs **`eslint ./src --max-warnings 0`** first.
- Failure was **`simple-import-sort/imports`** on `users.integration.test.ts` — fixed by **`eslint --fix`** (move `@podverse/orm` import after external imports with a blank line between groups).

#### Files Modified

- apps/management-api/src/routes/users.integration.test.ts
- .llm/history/active/api-test-auth-regressions/api-test-auth-regressions-part-01.md

### Session 2 - 2026-04-28

#### Prompt (Developer)

@/Users/mitcheldowney/.cursor/projects/Users-mitcheldowney-repos-pv-podverse-ansible/terminals/9.txt:7-339 debug the errors. determine if they are actual code problems or just test problems, then fix accordingly

#### Key Decisions

- Original Vitest error (**no `NANO_ID_V2_MAX_LENGTH` on mock**) was **test-only**: partial `vi.mock('@podverse/orm')` omitted symbols entity decorators need.
- Replacing the whole `@podverse/orm` module is unsafe here: integration tests run **without** `DataSource.initialize()`; JWT auth still calls real `AdminAccountService` → TypeORM → **`EntityMetadataNotFoundError`** unless `AdminAccountService` is mocked like other route suites (`auth`, `admins`, `database`, etc.).
- Fix: mock `@mgmt-api/orm/services/adminAccount.js` + `@mgmt-api/lib/database/auditLog.js`; use **`vi.spyOn` on real `@podverse/orm`** for `hashPassword` / `generateRandomIdText` only (no full-package mock).
- **`mockClear` on `readQueryMock` does not drain `mockResolvedValueOnce` queues** → cross-test SQL stub bleed; use **`mockReset`** on read/write query mocks in `beforeEach` and re-seed hoisted `hashPassword` / `generateRandomIdText` fn implementations.
- Entity tweak: explicit `{ type: 'integer' }` on bare `@Column()` FKs in management-api admin entities matches Postgres migrations and avoids relying on decorator metadata where tooling is flaky.

#### Files Modified

- apps/management-api/src/routes/users.integration.test.ts
- apps/management-api/src/orm/entities/adminAccount.ts
- apps/management-api/src/orm/entities/adminAccountCredentials.ts
- apps/management-api/src/orm/entities/adminAccountPermissions.ts
- .llm/history/active/api-test-auth-regressions/api-test-auth-regressions-part-01.md

### Session 1 - 2026-04-22

#### Prompt (Developer)

Fix API test auth regressions

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Prompt (Developer)

@/Users/mitcheldowney/.cursor/projects/Users-mitcheldowney-repos-pv-podverse-ansible/terminals/11.txt:7-1036 there are multiple errors. debug and fix them.

#### Prompt (Developer)

Fix API test auth regressions

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Keep `GET /podroll/channel/:idOrIdText` public (200 without auth).
- Keep `POST /account/notification/channel/type` semantics as 401 when unauthenticated and 403 only for membership-denied authenticated users.
- Harden test assertions and isolate auth behavior to prevent cross-test leakage.
- Add `vi.resetModules()` in API test app bootstrap helper so each test file gets a fresh app/module graph and its own active `@podverse/orm` mock definitions.
- Verify with targeted specs, full `apps/api` suite, `test:e2e:api`, and full `npm test`.

#### Files Modified

- apps/api/src/test/account-follows-notifications.test.ts
- apps/api/src/test/category-channel-item-read.test.ts
- apps/api/src/test/helpers/index.ts
- .llm/history/active/api-test-auth-regressions/api-test-auth-regressions-part-01.md

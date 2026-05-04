# Username-only User Creation and Login

Started: 2026-05-03
Author: Agent
Context: Allow creating users with username only (no email, no password) in management UI; verify regular user login accepts either username or email.

---

### Session 1 - 2026-05-03

#### Prompt (Developer)

i don't think we want this as a requirement in podverse or metaboost when a user with a username and without an email address is created.

also, make sure podverse and metaboost will work for logging in with the various combinations

- username only
- email only
- has both username and email

the login form should work whether the user types in the username or the email if it aligns with what is expected matches a row

#### Prompt (Agent)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Removed the `requiresEmailAtInviteCompletion && !email && !password` gate at create-user time in `apps/management-api/src/routes/users.ts`. The pre-existing "at least one of username or email" check (line 157) still ensures every account has an identifier. Downstream `canIssueAdminInviteLink` check still gates invite-link generation per signup mode.
- At set-password time (`apps/api/src/controllers/account/account.ts`), relaxed the `requiresEmailAtInviteCompletion && !email` guard so it only fires when the account has neither email nor username on file (defense in depth - this branch is unreachable in practice because every account has at least one identifier from create time).
- Made the email field on `apps/web/src/app/set-password/SetPasswordPageClient.tsx` always optional. The label uses an explicit "(optional)" suffix in `admin_only_email` mode to communicate the relaxed requirement.
- Confirmed `ModalAuthLogin` already chooses the "Email or username" label outside of the strict `admin_only_email` / `admin_only_username` modes, and the underlying passport strategy in `apps/api/src/lib/auth/index.ts` routes by `identifier.includes('@')`.
- Out of scope: Podverse management/admin login (admin_account_credentials only has email column) - would require a schema migration.

#### Files Modified

- `apps/management-api/src/routes/users.ts` - removed the `requiresEmailAtInviteCompletion && !email && !password` gate
- `apps/api/src/controllers/account/account.ts` - `setPassword` only requires email when account has no email AND no username
- `apps/web/src/app/set-password/SetPasswordPageClient.tsx` - email field is always optional now; removed mode-conditional label / form check
- `apps/web/src/components/Modal/ModalAuthLogin.tsx` - login identifier label is always "Email or username" since both can be present in any non-public-signup mode
- `apps/api/src/test/auth.test.ts` - added `getByUsername` mock and four new test cases covering login by username (username-only account), login by username (account with both), login by email (account with both), and 401 for unknown username
- `apps/api/src/test/account.test.ts` - mocked `AccountSetPasswordService` and added four `POST /account/set-password` test cases (username-only account without email, email saved when provided for email-less account, invalid token, expired token)
- `apps/management-api/src/routes/users.integration.test.ts` - added `POST /users` describe block with auth/authz cases plus three create-user combinations (username only, email only, both with password) including assertions on returned `set_password_url`

#### Files Created

- `.llm/history/active/username-only-user-creation/username-only-user-creation-part-01.md`
- `apps/management-web/e2e/users-new-create-username-only.spec.ts` - Playwright spec verifying the management-web Create User form succeeds with username only and shows the invite link panel

### Session 2 - 2026-05-03

#### Prompt (Developer)

@/Users/mitcheldowney/.cursor/projects/Users-mitcheldowney-repos-pv-podverse-ansible/terminals/14.txt:894-895 debug

#### Key Decisions

- **POST /auth/login rate limit:** `max` was 5/min (IP-based). The auth integration suite issues more than five sequential login requests before the 429 test, so later cases returned **429** instead of **401/403**. Use `max: 100` when `config.nodeEnv === 'test'`, keep `5` in production. Extended the 429 test loop to 120 attempts so the limit is still hit under the higher test cap.
- **auth.test ORM mock:** Forward the optional `relations` config from `MockAccountService.getByEmail` / `getByUsername` into the spies so `expect.any(Object)` matches Passport’s real calls.
- **account.test set-password:** `credentialsUpdateMock` was not cleared between tests, so `not.toHaveBeenCalled()` failed after other tests invoked the mock. Added `beforeEach` → `credentialsUpdateMock.mockClear()` in the set-password describe.
- **health-ready.test:** Real `CategoryService.setCategoryCache()` hit the DB (missing `category` table in some stacks). Added a `vi.mock('@podverse/orm')` that only replaces `CategoryService` with a no-op, matching other API integration tests.

#### Files Modified

- `apps/api/src/routes/auth.ts` - test vs production login rate `max`
- `apps/api/src/test/auth.test.ts` - mock forwards second arg; 429 test loop length
- `apps/api/src/test/account.test.ts` - `beforeEach` mockClear for set-password
- `apps/api/src/test/health-ready.test.ts` - `CategoryService` test double

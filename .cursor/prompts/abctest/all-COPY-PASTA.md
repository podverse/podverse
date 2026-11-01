# abctestall run {{SET}}

Started by `./scripts/abctest/run.sh all`, which copies this template into a fresh set and runs it
with plan-runner: one new agent per step, one step at a time. Every step follows the **abctestall**
skill § Runner steps. Do not paste these prompts into a chat.

The run stays in this checkout on the current branch. Do not create a git worktree. Do not run
`git add`, `git commit`, or `git push`. Leave every fix unstaged. Android and workers broker
integration are out of this sweep.

When the run pauses, fix the cause and continue the same agent:
`./scripts/abctest/run.sh all --resume 'What you changed.'`

## Unit

- [ ] **01 — Unit tier**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
You are step 01 of abctestall run {{SET}}. Follow .cursor/skills/abctestall/SKILL.md § Runner steps.

Stay in this checkout on the current branch. Do not create a git worktree. Do not run git add, git commit, or git push. Leave every change unstaged. Do not run Android.

Run tier 1 only (unit, packages and apps except API, management-api, and mobile):
npm run test:unit
```

- [ ] **02 — Mobile unit tier**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
You are step 02 of abctestall run {{SET}}. Follow .cursor/skills/abctestall/SKILL.md § Runner steps.

Stay in this checkout on the current branch. Do not create a git worktree. Do not run git add, git commit, or git push. Leave every change unstaged. Do not run Android.

Run tier 2 only (mobile unit):
npm --prefix apps/mobile run test
```

## Integration

- [ ] **03 — API and management-api integration**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
You are step 03 of abctestall run {{SET}}. Follow .cursor/skills/abctestall/SKILL.md § Runner steps.

Stay in this checkout on the current branch. Do not create a git worktree. Do not run git add, git commit, or git push. Leave every change unstaged. Do not run Android.

Run tier 3 only. Build packages first, because earlier steps may have changed them:
npm run build:packages
make test_deps
npm run test:e2e:api
```

## Playwright

- [ ] **04 — Web Playwright**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
You are step 04 of abctestall run {{SET}}. Follow .cursor/skills/abctestall/SKILL.md § Runner steps.

Stay in this checkout on the current branch. Do not create a git worktree. Do not run git add, git commit, or git push. Leave every change unstaged. Do not run Android.

Run the base web Playwright suite only. Build packages first:
npm run build:packages
make e2e_test_web

Rerun one failing spec with make e2e_test_web_report_spec SPEC=<path>.
```

- [ ] **05 — Web Playwright variants**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
You are step 05 of abctestall run {{SET}}. Follow .cursor/skills/abctestall/SKILL.md § Runner steps.

Stay in this checkout on the current branch. Do not create a git worktree. Do not run git add, git commit, or git push. Leave every change unstaged. Do not run Android.

Run the web variants only, in this order. Seed once first, and reseed before a variant when an
earlier variant's failure may have left data behind:
make e2e_seed_web
npm run test:e2e:cloudflare-enabled -w @podverse/web -- --reporter=list
npm run test:e2e:cookie-consent-enabled -w @podverse/web -- --reporter=list
npm run test:e2e:signup-enabled -w @podverse/web -- --reporter=list
npm run test:e2e:custom-themes-native -w @podverse/web -- --reporter=list
npm run test:e2e:custom-themes-remote -w @podverse/web -- --reporter=list
npm run test:e2e:custom-themes-combo -w @podverse/web -- --reporter=list

Rerun one failing spec with the same variant script plus the spec path.
```

- [ ] **06 — Management-web Playwright**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
You are step 06 of abctestall run {{SET}}. Follow .cursor/skills/abctestall/SKILL.md § Runner steps.

Stay in this checkout on the current branch. Do not create a git worktree. Do not run git add, git commit, or git push. Leave every change unstaged. Do not run Android.

Run management-web only, in this order:
make e2e_test_management_web
npm run test:e2e:cloudflare-enabled -w @podverse/management-web -- --reporter=list
make e2e_test_management_web_storage_enabled

Rerun one failing base spec with make e2e_test_management_web_report_spec SPEC=<path>.
```

## iOS Maestro

`./scripts/abctest/run.sh all` exits until Mobile E2E Metro is listening. In the **Mobile E2E
Metro** tab, leave `npm run mobile:dev:e2e` running first. Port 8081 must be that E2E bundle.
Do not start Android.

- [ ] **07 — iOS Maestro prep and areas a–d**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
You are step 07 of abctestall run {{SET}}. Follow .cursor/skills/abctestall/SKILL.md § Runner steps and
§ iOS Maestro.

Stay in this checkout on the current branch. Do not create a git worktree. Do not run git add, git commit, or git push. Leave every change unstaged. Do not run Android.

Prepare the mobile services, then run every iOS area in apps/mobile/e2e/HOW-TO-RUN.md
§ Complete area list whose name starts with a, b, c, or d, one flow at a time.
Use npm run mobile:e2e:test -- --platform ios <area>. Never pass --platform android.
```

- [ ] **08 — iOS Maestro areas e–o**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
You are step 08 of abctestall run {{SET}}. Follow .cursor/skills/abctestall/SKILL.md § Runner steps and
§ iOS Maestro.

Stay in this checkout on the current branch. Do not create a git worktree. Do not run git add, git commit, or git push. Leave every change unstaged. Do not run Android.

Confirm the mobile services are healthy, then run every iOS area in
apps/mobile/e2e/HOW-TO-RUN.md § Complete area list whose name starts with e through o, one flow
at a time. Use npm run mobile:e2e:test -- --platform ios <area>. Never pass --platform android.
```

- [ ] **09 — iOS Maestro areas p**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
You are step 09 of abctestall run {{SET}}. Follow .cursor/skills/abctestall/SKILL.md § Runner steps and
§ iOS Maestro.

Stay in this checkout on the current branch. Do not create a git worktree. Do not run git add, git commit, or git push. Leave every change unstaged. Do not run Android.

Confirm the mobile services are healthy, then run every iOS area in
apps/mobile/e2e/HOW-TO-RUN.md § Complete area list whose name starts with p, one flow at a time.
Use npm run mobile:e2e:test -- --platform ios <area>. Never pass --platform android.
```

- [ ] **10 — iOS Maestro areas q–z**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
You are step 10 of abctestall run {{SET}}. Follow .cursor/skills/abctestall/SKILL.md § Runner steps and
§ iOS Maestro.

Stay in this checkout on the current branch. Do not create a git worktree. Do not run git add, git commit, or git push. Leave every change unstaged. Do not run Android.

Confirm the mobile services are healthy, then run every iOS area in
apps/mobile/e2e/HOW-TO-RUN.md § Complete area list whose name starts with q through z, one flow
at a time. Use npm run mobile:e2e:test -- --platform ios <area>. Never pass --platform android.
```

- [ ] **11 — iOS Maestro unlisted flows and tablet**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
You are step 11 of abctestall run {{SET}}. Follow .cursor/skills/abctestall/SKILL.md § Runner steps and
§ iOS Maestro.

Stay in this checkout on the current branch. Do not create a git worktree. Do not run git add, git commit, or git push. Leave every change unstaged. Do not run Android.

Confirm the mobile services are healthy. Run every top-level apps/mobile/e2e/*.yaml phone flow
that HOW-TO-RUN.md § Complete area list does not name, one at a time, with --platform ios.
Then run tablet last, as § iOS Maestro describes. Never pass --platform android.
```

## Close

- [ ] **Close — Sweep summary**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** low

```
You are the last step of abctestall run {{SET}}. Do not run tests or change code. Do not create a git worktree. Do not run git add, git commit, or git push.

Read every final message this run saved (01 through 11) and
.llm/plans/active/abctestall-deferred.md. Write the summary .cursor/skills/abctestall/SKILL.md § Done
describes: passes per tier, fixes (file, cause, rerun command, result), and deferred entries.
Name any tier whose post-fix rerun did not pass. If the deferred file has entries, end by telling
the operator to run ./scripts/abctest/run.sh deferred.
```

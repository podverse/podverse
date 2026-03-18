### Session 1 - 2026-02-04

#### Prompt (Developer)

with the npm run build and related build commands, it would be nice if all the errors are summarized at the end of the full run of commands

#### Key Decisions

- Add a workspace build runner that captures failures and prints a summary at the end.
- Route build scripts through the new runner to keep output consistent.

#### Files Modified

- scripts/ci/run-workspaces.mjs
- package.json

### Session 2 - 2026-02-04

#### Prompt (Developer)

@/Users/mitcheldowney/.cursor/projects/Users-mitcheldowney-repos-pv-pv-code-workspace/terminals/7.txt check the build scripts

#### Key Decisions

- Add a fallback workspace resolver for npm versions without `npm workspaces list`.

#### Files Modified

- scripts/ci/run-workspaces.mjs

### Session 3 - 2026-03-18

#### Prompt (Developer)

Debug and Resilience Plan for Publish Alpha Build

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Add a deterministic `@parcel/watcher` presence check + fallback install after `npm ci` in publish-alpha validate.
- Mirror the same guard in ci validate for consistency across workflows.
- Use `npm install --no-save @parcel/watcher` as the fallback so CI can recover from platform-specific lockfile optional dependency gaps without mutating `package-lock.json`.

#### Files Modified

- .github/workflows/publish-alpha.yml
- .github/workflows/ci.yml
- .llm/history/active/build-error-summary/build-error-summary-part-01.md

### Session 4 - 2026-03-18

#### Prompt (Developer)

include the hardening and implement the plan

#### Key Decisions

- Replace the watcher check from `require.resolve` to runtime `require` so native binding load is validated.
- Add Linux explicit fallback package `@parcel/watcher-linux-x64-glibc` in CI guard fallback install.
- Add a preflight step that logs platform and verifies runtime watcher load before app builds.

#### Files Modified

- .github/workflows/publish-alpha.yml
- .github/workflows/ci.yml
- .llm/history/active/build-error-summary/build-error-summary-part-01.md

### Session 5 - 2026-03-18

#### Prompt (Developer)

implement your recommendations so that the github action will complete finally

#### Key Decisions

- Stop mutating dependencies after `npm ci` and instead install with optional dependencies included via `npm ci --include=optional`.
- Replace watcher fallback install logic with non-mutating runtime verification checks for `@parcel/watcher`.
- Keep verification in both publish-alpha and ci workflows for cross-platform visibility.

#### Files Modified

- .github/workflows/publish-alpha.yml
- .github/workflows/ci.yml
- .llm/history/active/build-error-summary/build-error-summary-part-01.md

### Session 8 - 2026-03-18

#### Prompt (Developer)

https://github.com/podverse/podverse/actions/runs/23230401297 there is another error. should we remove "webpack" since we don't use webpack locally? what is going wrong?

implement

#### Key Decisions

- Root cause: `next.config.ts` requires `@next/swc-linux-x64-gnu` (Rust SWC compiler) to load TypeScript
  config files. That Linux binary is absent from the macOS-generated lockfile, causing `Failed to load
native binding` before any build starts.
- Fix: convert both `apps/web/next.config.ts` and `apps/management-web/next.config.ts` to `.mjs`. Next.js
  loads `.mjs` as plain ESM — no SWC compiler or native bindings required.
- Revert `--webpack` flag from both build scripts (it was a wrong workaround; `next build` already uses
  Webpack by default). Remove `webpack` devDep from `apps/management-web` (it was only added for the flag).
- Applied identical changes to boilerplate since it has the same setup.

#### Files Modified

- apps/web/next.config.mjs (new, replaces next.config.ts)
- apps/management-web/next.config.mjs (new, replaces next.config.ts)
- apps/web/package.json
- apps/management-web/package.json
- package-lock.json
- .llm/history/active/build-error-summary/build-error-summary-part-01.md

### Session 7 - 2026-03-18

#### Prompt (Developer)

what the heck is going on? we have tried fixing this many times now. https://github.com/podverse/podverse/actions/runs/23230212034/job/67521911754 could the module we need just be missing? is there an outage? what is wrong? it adding log statements to the action will help you debug then add them.

Fix Node.js require-cache Bug in Watcher Preflight

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Root cause identified: Node.js `require` caches module failures within the same process. After the fallback
  `npm install --no-save` succeeded ("added 1 package"), the second `canLoad()` call in the same process
  returned the cached failure instead of re-evaluating the module — causing the preflight to always throw
  even though the binary was correctly installed.
- Fix: replace single `node -e "..."` one-liner with bash-controlled flow that uses separate `node`
  subprocess invocations for each check. Each subprocess starts with a fresh `require.cache`, so the
  post-install verification genuinely tests the newly-installed binary.
- Applied identical fix to podverse and boilerplate (both `publish-alpha.yml` and `ci.yml`).

#### Files Modified

- .github/workflows/publish-alpha.yml
- .github/workflows/ci.yml
- .llm/history/active/build-error-summary/build-error-summary-part-01.md

### Session 6 - 2026-03-18

#### Prompt (Developer)

implement. also consider that boilerplate may need similar fixes since it is a next js project too

#### Key Decisions

- Replace strict preflight with targeted Linux binary self-heal that installs `@parcel/watcher-linux-x64-glibc` at the already-installed watcher version when runtime load fails.
- Keep `npm ci --include=optional` and avoid broad watcher package reinstall.
- Apply equivalent defensive install/preflight workflow pattern to Boilerplate Next.js CI workflows.

#### Files Modified

- .github/workflows/publish-alpha.yml
- .github/workflows/ci.yml
- .llm/history/active/build-error-summary/build-error-summary-part-01.md

# 03 — Agent rules, skill, prompt, and hooks

## Goal

Agents add release notes as part of normal work, never touch frozen files, and never run publish or
tag operations. Guidance says it; hooks and the git pre-push hook enforce it.

Before writing the hook files, confirm the current Cursor hooks schema (event names, stdin JSON
fields, output fields such as `permission` and `followup_message`) with the Cursor docs. Use the
`cursor-guide` subagent. Adjust the scripts below to match what the docs say.

## Rules (`.cursor/rules/`)

### `release-notes-authoring.mdc` (alwaysApply: true)

- When a change alters what a user sees or does in an app, or a developer contract (endpoint, field,
  env var, migration, job), add one line for each affected app in the same change:
  `make release_notes_add APP=<id> TEXT="<plain sentence>"`. Run `make release_notes_new APP=<id>`
  first if the file is missing.
- Write the line in the tone of the app's audience (see the `release-notes` skill). One sentence;
  the commit hash is added at finalize, not by hand.
- Skip notes for refactors, tests, tooling, CI, docs, and invisible dependency bumps.
- Never edit a file with `status: frozen`. Never run `freeze`, `stamp-staging`, `carry-forward`, or
  any publish script; give the operator the command.
- When the response ends, name the notes lines added (or say none were needed and why).

### `release-notes-files.mdc` (globs: `**/release-notes/*.md`)

The file contract from 01: front matter, sections by audience, Working notes subsections, store
block limit, frozen immutability. Point to `docs/development/release/RELEASE-NOTES.md`.

### `release-notes-suggest.mdc` (already live)

Update the "Where the notes come from" list so the first source is
`make release_notes_compose VERSION=<X.Y.Z> FORMAT=<github|play|appstore>`, then the file, then
the git-log fallback.

### `operator-only-git-operations.mdc`

Add `freeze`, `stamp-staging`, the `scripts/publish/*` sync and bump scripts, `eas build`, and
`eas submit` to the operator-only list. Say the agent's job is to write the script and end with the
commands in run order.

## Skill: `.cursor/skills/release-notes/SKILL.md`

- When to use: adding a notes line, running the finalize prompt, giving release steps.
- The tone guide and GOOD/BAD examples from 01, extended with three real podverse examples per
  audience.
- How to pick affected apps for a shared-package change (map through `watch` in the config).
- The finalize workflow, linking the prompt below.

## Prompt: `.cursor/prompts/release-notes-finalize.md`

The operator pastes this with a version before freezing:

1. Run `make release_notes_target` and `git tag` to find the last formal tag.
2. For each configured app: read its draft, then `git log --no-merges <last formal>..HEAD` for its
   watch paths. Read diffs where a subject is vague.
3. Add Working notes lines for user-visible or contract changes the log shows but the notes miss.
4. Write the polished sections in the audience tone. User apps: at most 6 Highlights. Mobile: a
   Store block of at most 500 characters. Draft es, fr, and el-GR Store blocks for review if the
   operator chose localized store notes (00-SUMMARY open question 2).
5. Leave `status: draft`. Run `make release_notes_check` and fix errors.
6. End with the operator's next commands: review, `make release_notes_freeze VERSION=X.Y.Z`,
   commit, PR, then the sync scripts in order.

## Cursor hooks

`.cursor/hooks.json` plus scripts in `.cursor/hooks/`. Update `CURSOR-HOOKS.md` to describe both.

### `guard-operator-commands.sh` (`beforeShellExecution`)

Reads the command from stdin JSON. Denies, with an agent message saying "operator-only: write the
script or give the operator this command":

- `git push`, `git tag`, `git commit`, `git merge` into `main`/`staging`/`develop`, `git rebase`
- `gh pr create|merge|close|edit`, `gh release *`, mutating `gh api` calls (`-X POST|PATCH|PUT|DELETE`)
- `npm publish`, `eas build`, `eas submit`, `npx eas-cli ... build|submit`
- `make mobile_eas_android_build|mobile_eas_android_submit|release_notes_freeze`
- `scripts/publish/*`, `scripts/release-notes/(freeze|stamp-staging|carry-forward)`

Allows everything else, including read-only `git status|diff|log|show|tag --list` and `gh * view|list`.
Match on the parsed command words, not substrings of arguments, so `rg "git push" docs` is allowed.
Keep the pattern list in one array at the top of the script.

### `release-notes-stop.sh` (`stop`)

1. Exit with `{}` when the hook input says this is already a follow-up loop (loop count ≥ 1), so it
   reminds at most once per turn.
2. Run `node scripts/release-notes/check.mjs --changed --hook stop --json`.
3. Errors (frozen file edited, bad format): reply with a follow-up telling the agent to revert the
   frozen edit or fix the format.
4. Coverage warnings: reply with a follow-up listing the apps that changed without a notes line and
   the `make release_notes_add` command, or asking the agent to say why none is needed.
5. Nothing found: `{}`.

Both scripts: `set -euo pipefail`, no network, finish in under 2 seconds, and fail open (print `{}`)
if node or the config is missing, so a broken hook never wedges a session.

## Git pre-push hook

Extend `scripts/git-hooks/pre-push` (installed by `prepare`) after the branch-name check:

```bash
node scripts/release-notes/check.mjs --range "origin/develop...HEAD" --hook pre-push
```

Errors block the push; warnings print. Skip quietly when `origin/develop` is unknown. The publish
scripts already push with `--no-verify`, so they are unaffected.

## Done when

- The three rules, the skill, the prompt, `hooks.json`, both hook scripts, and the pre-push change
  exist.
- `CURSOR-HOOKS.md` explains what each hook blocks or reminds about.
- The hook scripts have a small `node:test` or bash test that feeds sample stdin JSON (allowed
  command, denied command, stop with and without missing notes).

# fix-ebadplatform-npm-ci

**Started:** 2026-05-06  
**Author:** Cursor Agent  
**Context:** Regenerate Linux-canonical `package-lock.json` to fix `EBADPLATFORM` / `lightningcss-android-arm64` on GitHub Actions `validate` (`npm ci --include=optional`).

### Session 1 - 2026-05-06

#### Prompt (Developer)

Debug plan: `EBADPLATFORM` / `lightningcss-android-arm64` on validate

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Ran `./scripts/development/update-lockfile-linux.sh` (Docker `node:24`, `linux/amd64`) to refresh `package-lock.json`.
- Verified in Docker: `npm ci --include=optional`, `npm run build:packages`, `npm run build:apps` — all succeeded; no workflow flag change (`npm ci` without `--include=optional`) needed after regen.
- Small lockfile diff (13 insertions / 13 deletions); committed for CI alignment.

#### Files Created/Modified

- `package-lock.json`
- `.llm/history/active/fix-ebadplatform-npm-ci/fix-ebadplatform-npm-ci-part-01.md`

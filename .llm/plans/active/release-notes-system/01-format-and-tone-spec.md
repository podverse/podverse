# 01 — Format and tone spec

## Goal

Define one contract for release notes files that the scripts validate, the rules teach, and every
repo copies. Write it as a contributor doc plus a machine-readable config.

## Deliverables

1. `release-notes.config.json` at the podverse repo root.
2. `docs/development/release/RELEASE-NOTES.md` (contributor guide).
3. A template the `new` script renders (lives in `scripts/release-notes/template.mjs`, built in 02;
   this step defines its content).

## Config: `release-notes.config.json`

```json
{
  "versionSource": "package.json",
  "formalTagPattern": "^\\d+\\.\\d+\\.\\d+$",
  "prereleaseTagPattern": "^(\\d+\\.\\d+\\.\\d+)-staging\\.(\\d+)$",
  "apps": [
    {
      "id": "mobile",
      "dir": "apps/mobile",
      "title": "Podverse Mobile",
      "audience": "user",
      "storeBlock": true,
      "watch": ["apps/mobile/src/**", "apps/mobile/app.config.ts", "packages/i18n-catalog/mobile/**"],
      "ignore": ["**/*.test.*", "**/__tests__/**", "apps/mobile/e2e/**", "**/*.md"]
    }
  ]
}
```

Add entries for `web`, `management-web` (`audience: user`) and `api`, `management-api`, `workers`
(`audience: developer`). `watch` decides which changed paths count as "this app changed" for the
coverage reminder. Shared packages map to the apps whose users notice them: `packages/ui/**` to web
and management-web, `packages/i18n-catalog/web/**` to web. Keep the lists short; they drive a
reminder, not a gate.

## File layout

`<dir>/release-notes/<X.Y.Z>.md`, for example `apps/mobile/release-notes/5.5.3.md`.

Filename is always the formal version. A prerelease in `package.json` (`5.5.4-beta.1`) still
targets `5.5.4.md`. Prerelease tags appear only as subsection headings inside the file.

## Front matter

```yaml
---
app: mobile
version: 5.5.3
audience: user
status: draft
frozen_at:
---
```

- `status`: `draft` (editable) or `frozen` (immutable).
- `frozen_at`: ISO date, set only by the freeze script.
- `app`, `version`, `audience` must match the config and the filename.

## Body: user audience

```markdown
# Podverse Mobile 5.5.3

## Highlights

## Improvements

## Fixes

## Store: What's new

## Working notes

### Unreleased

- Premium can be bought with Google Play, monthly or yearly (abc1234)
```

- **Highlights:** 1–6 bullets, the changes a user would tell a friend about.
- **Improvements / Fixes:** optional; short bullets; omit the heading when empty.
- **Store: What's new** (only when `storeBlock: true`): plain text, at most 500 characters, no
  Markdown links. Becomes the Play `<en-US>` block and the App Store text.
- **Working notes:** the raw running log. Agents append here. Each line is one plain sentence and
  a short commit or PR reference. Removed by the freeze script.

## Body: developer audience

```markdown
# Podverse API 5.5.3

## Breaking changes

## Added

## Changed

## Fixed

## Operator notes

## Working notes

### Unreleased
```

**Operator notes** covers new or renamed env vars, migrations, new queues or jobs, and anything a
deployer must do. Omit empty headings at freeze.

## Working notes subsections

- `### Unreleased`: always present in a draft; new lines go here.
- `### X.Y.Z-staging.N`: created by the stamp script when a staging sync ships those lines.
- `### Carried from X.Y.W`: created by carry-forward when a version was bumped without ever getting
  a formal tag (podverse skipped formal `5.5.1`, for example). Those lines still belong in the next
  formal release.

## Status rules

- A draft can be edited, rewritten, or deleted (carry-forward deletes the old draft).
- A frozen file is never edited or deleted. The check script compares against the base ref and
  fails on any change.
- A frozen file has no `## Working notes` section and no empty headings.
- Every configured app gets a file at freeze, even with nothing to say. User apps with nothing say
  `No changes you'll notice in this release.` and are left out of the GitHub body; developer apps say
  `No notable changes.`

## Tone guide

User-facing (mobile, web, management-web):

- Benefit first, plain words, present tense, no internals.
- Name what the user can now do, not what the code does.
- No ticket numbers, commit hashes, library names, or SDK versions in the polished sections.

```text
GOOD  Go Premium right from the app with Google Play, monthly or yearly.
GOOD  Pick up where you left off: your queue now syncs between devices.
BAD   Migrated billing to expo-iap 5 and OpenIAP bindings.
BAD   Fixed bug in useQueueSync hook (#412).
```

Developer-facing (api, management-api, workers, libraries):

- Precise and complete for anything that changes a contract or a deployment.
- Name endpoints, fields, env vars, and migrations exactly.

```text
GOOD  POST /billing/google-play/confirm accepts prepaid base plans (prepaid-monthly, prepaid-annual).
GOOD  New env var GOOGLE_PLAY_RTDN_PUSH_AUDIENCE; required when BILLING_GOOGLE_PLAY_ENABLED=true.
BAD   Various billing improvements.
```

What never goes in: refactors, tests, lint, CI, docs, dependency bumps with no visible effect, and
any change the commits do not show.

## Contributor doc

`docs/development/release/RELEASE-NOTES.md` covers: why the files exist, the lifecycle diagram from
`00-SUMMARY.md`, the layout and sections above, the tone guide, and the operator command order
(filled in by 04). Link it from `docs/development/release/STAGING-MAIN-PROMOTION.md` and
`scripts/publish/README.md`.

## Done when

- `release-notes.config.json` lists all six podverse apps with watch and ignore globs.
- The contributor doc exists and the template content is specified for 02.
- No source code changes in this step.

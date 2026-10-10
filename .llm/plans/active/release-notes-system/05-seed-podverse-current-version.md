# 05 — Seed podverse notes for the current version

## Goal

Write the first real notes: podverse `5.5.3` for all six apps, from the changes since the last
formal tag. This is also the first live run of the finalize prompt, so fix the prompt (not the
scripts) if its instructions fall short.

Owns `apps/*/release-notes/*` and `.cursor/prompts/release-notes-finalize.md` only. Do not edit
scripts; if a script bug blocks this step, stop and report it.

## Inputs

- Target version: `make release_notes_target` should print `5.5.3` (root `package.json` is 5.5.3,
  tags reach `5.5.3-staging.2`, no formal `5.5.3` yet). Stop if it prints anything else.
- Last formal tag: `5.5.2`. Staging tags since then: `5.5.3-staging.0`, `.1`, `.2`.
- Change volume: about 190 non-merge commits touch `apps/mobile` alone since `5.5.2`.

## Steps

1. `make release_notes_new ALL=1` creates six drafts.
2. For each app, list commits since `5.5.2` for its watch paths and group them by staging tag:

```bash
git log --no-merges --format='%h %s' 5.5.2..5.5.3-staging.0 -- apps/mobile
git log --no-merges --format='%h %s' 5.5.3-staging.0..5.5.3-staging.1 -- apps/mobile
git log --no-merges --format='%h %s' 5.5.3-staging.1..5.5.3-staging.2 -- apps/mobile
git log --no-merges --format='%h %s' 5.5.3-staging.2..HEAD -- apps/mobile
```

3. Under Working notes, write `### 5.5.3-staging.0` / `.1` / `.2` and `### Unreleased` with one
   plain line per user-visible change (developer apps: per contract change), each with its short
   hash. Merge many commits about one feature into one line. Skip refactors, tests, tooling, docs.
4. Run the finalize prompt for `5.5.3` to write the polished sections.
5. `make release_notes_check`; fix any errors.
6. Leave every file as `status: draft`.

## Mobile starting point

Use this Store block as the starting draft and refine it against the log:

```text
Welcome to the first Podverse Next test build!
- Go Premium with Google Play: buy a month or a year at a time
- A redesigned player with chapters, clips, and live streams
- Queue, history, playlists, and automatic downloads
- Faster startup and image loading
- Built to Google Play's latest Android requirements
```

Likely Highlights themes from the log: Premium through Google Play; the full player (chapters,
chapter artwork, clips); queue, history, and playlists; auto-download per channel; add by RSS;
faster startup and images. Confirm each against commits before keeping it.

## Developer apps

For `api`, `management-api`, `workers`, focus on contract and deployment changes since `5.5.2`:
billing processor adapters, Google Play and prepaid subscription endpoints, new env vars (for
example `BILLING_GOOGLE_PLAY_ENABLED`, `GOOGLE_PLAY_*`), migrations under
`infra/k8s/base/ops/source/database/linear-migrations/`, new jobs or queues. Operator notes must
list every new required env var.

## Done when

- Six `5.5.3.md` drafts exist and pass `make release_notes_check`.
- Mobile has a Store block under 500 characters.
- The response ends with the operator's review step and the freeze command, without running it.

# GitHub Actions run from pinned commits

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

## Issue

https://github.com/podverse/podverse/issues/421

## Rows

- **R1** Every workflow `uses:` step runs a commit, with the tag name kept in a comment.

## Runs after

none

## Alpha GitOps (k.podcastdj.com)

None. These workflows do not run on the alpha cluster. No env key and no logout.

## Review before running

No operator question. Do not change the npm audit allowlist. It is empty, and
`scripts/lib/check-audit-gate.sh` already fails closed on moderate and higher findings.
Do not add a finding to that allowlist in this change.

## Files

- `.github/workflows/ci.yml`
- `.github/workflows/publish-staging.yml`
- `.github/workflows/publish-main.yml`
- `.github/workflows/i18n.yml`
- `.github/workflows/vulnerability-scanner.yml`
- `.github/workflows/pr-labeler.yml`

If a search finds another `uses:` under `.github/`, pin that file too and list it.

## Tests

No unit test. In the final message, list each action, the tag it had, and the commit SHA
you pinned. That list is the review.

## Release scratchpad

none

## Work

For each third-party action, resolve the commit the current tag points at and replace the
tag with that SHA. Keep the tag in a trailing comment so Dependabot's github-actions
updates still apply:

```yaml
uses: actions/checkout@<40-char-sha> # v7
```

Resolve SHAs with read-only `git ls-remote` or `gh`. Do not guess a SHA. Pin the commit
the tag points at when you run, not an older commit from memory.

Do not change workflow permissions, triggers, or job logic. Do not edit
`.github/dependabot.yml` unless a pin comment would stop the existing weekly
`github-actions` updates. The weekly update is already configured and stays.

## Ticket reply

Save as `proposed-reply.md`. Do not post it. After the change is on `develop`, post it
and close issue 421.

```text
GitHub Actions workflows now run each third-party action from a pinned commit. The
version tag stays in a comment so the weekly dependency updates can still move the pin.
The npm audit gate is unchanged.
```

## Done

Search issue 421 again before the first edit. Do not run tests. Do not commit. Do not
comment on or close the issue. Write `proposed-reply.md`, move this directory to
`.llm/plans/completed/421-actions-pin-sha/`, and give the operator fish-safe git commands.
There is no test command. The close recommendation is only for after `develop`.

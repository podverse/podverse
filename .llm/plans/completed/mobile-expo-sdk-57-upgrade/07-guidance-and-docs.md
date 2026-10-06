# 07 — Guidance and docs (abcmemory + contributor docs)

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

## Goal

Align agent memory and contributor docs with Expo SDK 57 / RN 0.86 /
deployment target 16.4 / retired patch scripts / Billing 8 via expo-iap 5.

## Preconditions

- Prompt 05 complete. Prompt 06 either greened Maestro or stopped cleanly
  with deferred morning notes (stack not up / CarPlay / USB).
- Document what actually shipped, including any deferred items.
## Ownership

- **Owns:** listed guidance and docs files + future-forward comment fixes
- **Must not:** change runtime package pins or native plugins unless a doc
  example is wrong and the fix is a one-line comment-only correction in a
  doc (code fixes belong in 04–06)

## Files to update

### abcmemory (`.cursor/`)

1. [`.cursor/skills/mobile-expo-monorepo/SKILL.md`](../../../../.cursor/skills/mobile-expo-monorepo/SKILL.md)
   - SDK **57** / RN **0.86** throughout
   - Peer pin table: replace SDK 52 pins (`screens ~4.4`, etc.) with the
     versions actually in `apps/mobile/package.json` after 01
   - Failure table: drop or rewrite “SDK 52 / Xcode 27 patch” rows to match
     retired scripts; note Device Hub is upstream in Expo CLI 57
   - `tar` note: document current policy (no pin unless `reading 'extract'`)
2. [`.cursor/rules/mobile-ios-simulator.mdc`](../../../../.cursor/rules/mobile-ios-simulator.mdc)
   - Deployment floor **16.4** where 15.x is stated as the Expo floor
   - Patch-script references if any still name the retired scripts
3. [`.cursor/rules/vscode-terminals-commands.mdc`](../../../../.cursor/rules/vscode-terminals-commands.mdc)
   - Expo CLI note that currently says SDK 52 → SDK 57
4. [`apps/mobile/AGENTS.md`](../../../../apps/mobile/AGENTS.md) — any SDK 52
   / RN 0.76 / patch-script mentions

### Contributor docs / comments

5. [`apps/mobile/APPS-MOBILE.md`](../../../../apps/mobile/APPS-MOBILE.md)
6. [`apps/mobile/modules/podverse-media-engine/CARPLAY-ENTITLEMENT.md`](../../../../apps/mobile/modules/podverse-media-engine/CARPLAY-ENTITLEMENT.md)
7. [`apps/mobile/src/downloads/downloadStorage.ts`](../../../../apps/mobile/src/downloads/downloadStorage.ts)
   — comment that cites SDK 52 / FileSystem (say Expo FileSystem legacy
   entry or “ships with Expo”, future-forward)
8. [`docs/development/security/NPM-AUDIT-ALLOWLIST.md`](../../../../docs/development/security/NPM-AUDIT-ALLOWLIST.md)
   — only if it names Expo 52 mobile pins
9. [`docs/testing/VERIFICATION-RUN-ISSUES.md`](../../../../docs/testing/VERIFICATION-RUN-ISSUES.md)
   — only SDK 52 / known-issue rows that no longer apply
10. [`docs/operations/mobile/MOBILE-RELEASE-RUNBOOK.md`](../../../../docs/operations/mobile/MOBILE-RELEASE-RUNBOOK.md)
    — Node / EAS / SDK notes if they still say 52

### Search pass

From repo root (agent may run read-only `rg`):

```text
SDK 52|sdk 52|0\.76\.9|52\.0\.49|patch-expo-cli-xcode27|patch-expo-localization-xcode26
```

Update remaining **authoritative** hits under `.cursor/`, `apps/mobile`
docs/comments, and the docs paths above. Skip:

- `.llm/plans/completed/**` and this plan set’s historical “from 52” wording
  in summaries (those describe the migration)
- Proposal archives under `docs/proposals/**` unless a one-line stale
  “current SDK” claim would mislead operators
- Generated / lock / lighthouse JSON

## Style

- Comments and docs: **comments-future-forward** — no “we upgraded from 52”
- English UI chrome elsewhere unchanged (this prompt is docs / guidance)

## Done when

- mobile-expo-monorepo skill describes SDK 57 as current
- Simulator / terminals rules no longer require the retired Expo CLI /
  localization patches as the default fix
- Contributor docs match deployment target 16.4 and current pins

## Agent verify (required)

```bash
rg -n "SDK 52|52\\.0\\.49|0\\.76\\.9|patch-expo-cli-xcode27|patch-expo-localization" .cursor apps/mobile/AGENTS.md apps/mobile/APPS-MOBILE.md docs/operations/mobile docs/development/security/NPM-AUDIT-ALLOWLIST.md docs/testing/VERIFICATION-RUN-ISSUES.md
```

Expect no authoritative “current SDK is 52” hits outside this plan set’s
migration narrative. Fix any remaining authoritative hits you own, then
re-run the `rg` until clean (or list intentional leftovers).

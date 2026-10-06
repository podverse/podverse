# Release notes system — COPY-PASTA prompts

## Execution rules

- **Phases are sequential.** Phase 1 → wait → Phase 2 → wait → Phase 3 → wait → final verify.
- **Within Phase 1, prompts run in order** (01, then 02, then 03).
- **Within Phases 2 and 3, the two prompts run in parallel** in two agents.
- Agents do not run tests, git writes, or publish scripts. Each prompt ends with operator commands.
- Answer the four open questions in `00-SUMMARY.md` before starting Phase 1.

| Prompt | Phase | Cursor model | Reasoning | Why |
| ------ | ----- | ------------ | --------- | --- |
| 01 Format and tone spec | 1 | Cursor Grok 4.7 | medium | Docs and config |
| 02 Scripts and Make | 1 | Codex 5.3 | high | Parsing, git ranges, tests |
| 03 Agent rules and hooks | 1 | Opus 5.5 | high | Hook schema and command guard are safety-critical |
| 04 CI and publish integration | 2 | Opus 5.5 | high | Publish train gates |
| 05 Seed podverse 5.5.3 | 2 | Opus 5.5 | high | Copy quality for user-facing notes |
| 06 metaboost rollout | 3 | Cursor Grok 4.7 | high | Mostly copying with adaptation |
| 07 partytime + podverse-mcp | 3 | Cursor Grok 4.7 | high | Mostly copying with adaptation |

---

## Phase 1 — podverse foundation (sequential)

- [ ] **01 — Format and tone spec**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/active/release-notes-system/01-format-and-tone-spec.md

Context and locked decisions: .llm/plans/active/release-notes-system/00-SUMMARY.md.
Config and contributor doc only; no source code.

Do not run tests during agent work; end with operator verification commands.
```

- [ ] **02 — Scripts and Make**

**Cursor model:** Codex 5.3 · **Reasoning:** high

```
Read and execute .llm/plans/active/release-notes-system/02-scripts-and-make.md

Follow the contract in 01-format-and-tone-spec.md and docs/development/release/RELEASE-NOTES.md.
Operator-only scripts must refuse a non-TTY stdin and never run git.

Do not run tests during agent work; end with operator verification commands.
```

- [ ] **03 — Agent rules and hooks**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/release-notes-system/03-agent-rules-and-hooks.md

Confirm the Cursor hooks schema with the cursor-guide subagent before writing hook scripts.
Hooks fail open; the command guard matches command words, not argument text.

Do not run tests during agent work; end with operator verification commands.
```

---

## Phase 2 — podverse integration (2 agents in parallel)

- [ ] **04 — CI and publish integration**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/release-notes-system/04-ci-and-publish-integration.md

You own .github/workflows/*, scripts/publish/*, scripts/mobile/eas-android.sh, and the release docs.
Do not touch apps/*/release-notes/*. Do not run any publish script.

Do not run tests during agent work; end with the operator release order as commands.
```

- [ ] **05 — Seed podverse 5.5.3**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/release-notes-system/05-seed-podverse-current-version.md

You own apps/*/release-notes/* and .cursor/prompts/release-notes-finalize.md only.
If a script bug blocks you, stop and report it; do not edit scripts.

Do not run tests during agent work; leave files as drafts and end with the freeze command.
```

---

## Phase 3 — sibling repos (2 agents in parallel)

- [ ] **06 — metaboost rollout**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/release-notes-system/06-metaboost-rollout.md

Work only in ../metaboost. Copy from podverse; do not edit podverse.

Do not run tests during agent work; end with metaboost operator commands in run order.
```

- [ ] **07 — partytime and podverse-mcp rollout**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/release-notes-system/07-partytime-and-podverse-mcp-rollout.md

Work only in ../partytime and ../podverse-mcp. Copy from podverse; do not edit podverse.
This is the last prompt: archive the plan set per the plan-completion skill and list every
operator verification command for the whole set.

Do not run tests during agent work.
```

---

## Final verification (operator, after Phase 3)

The last prompt's response lists these in full. Expected shape, in the **Root** tab:

```bash
npm run release-notes:test
make release_notes_check
make release_notes_compose VERSION=5.5.3 FORMAT=github
make release_notes_compose VERSION=5.5.3 FORMAT=play
make -C ../metaboost release_notes_check
npm --prefix ../partytime run release-notes:check
npm --prefix ../podverse-mcp run release-notes:check
```

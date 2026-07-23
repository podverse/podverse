# COPY-PASTA — mobile-pg7-pr-prep

Run prompts **1 → 3** in order on the uncommitted PG-7 / media-row working tree. Each prompt:
read its plan file, implement, check the box. **Do not run tests during agent work** (i18n
translate/compile/validate in step 1 is allowed — it is generation + catalog check, not the
test suite). Agents must **not** `git commit` / `gh pr create` unless the operator explicitly
asks.

## Step 1 — i18n locale parity

- [x] done

**Cursor model:** Auto

```text
Read and execute .llm/plans/active/mobile-pg7-pr-prep/01-i18n-locale-parity.md
Restore consumer-layer locale parity for new media_player keys (translate → compile → validate).
Mark COPY-PASTA step 1 done when finished. Do not run mobile/unit test suites during agent work.
Do not commit.
```

## Step 2 — Android Close confirm / fix

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-pg7-pr-prep/02-android-close-button.md
Confirm whether full-player Close works for real Android input; fix product code only if broken.
Keep Maestro Android Back dismiss unless Close also works under Maestro. Mark step 2 done.
Do not run the full E2E suite during agent work. Do not commit.
```

## Step 3 — Verify handoff + archive (final)

- [x] done

**Cursor model:** Auto

```text
Read and execute .llm/plans/active/mobile-pg7-pr-prep/03-verify-handoff.md
Archive this plan set to .llm/plans/completed/mobile-pg7-pr-prep/, update LLM-PLANS-ACTIVE and
LLM-PLANS-COMPLETED indexes, and end with cumulative operator verification commands plus
commit-staging guidance. Do not run tests during agent work. Do not commit unless the operator
explicitly asked for a commit in this message.
```

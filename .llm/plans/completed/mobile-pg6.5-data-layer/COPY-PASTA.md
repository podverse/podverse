# COPY-PASTA — mobile-pg6.5-data-layer (Track 9b)

Run prompts in order for the **data-layer critical path** (1 → 2 → 4). Prompts 3 and 5 depend on 2
and may follow 4. Prompts 6 → 7 (visual primitives) are independent and may run in a parallel
session. Each prompt: read its plan file + listed detail docs, implement, then mark the
master-plan steps + Appendix C + detail headers `done` and check the box here. **Do not run tests
during agent work** — operator verifies at the end.

Follow **mobile-data-layer** (repositories, dual-store §7.1) and **mobile-theme-parity** for
primitives prompts.

## Step 1 — DB scaffold

- [x] done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/active/mobile-pg6.5-data-layer/01-db-scaffold.md
Also read detail 490. Implement master step 9b.1. Mark done when finished.
Do not run tests during agent work.
```

## Step 2 — Repository seam + projection stubs

- [x] done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/active/mobile-pg6.5-data-layer/02-repository-seam.md
Also read detail 491 and DOCS-MOBILE-DATA-LAYER-OFFLINE.md §7.1. Implement master step 9b.2.
Mark done when finished. Do not run tests during agent work.
```

## Step 3 — Account snapshot repo

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-pg6.5-data-layer/03-account-repo.md
Also read detail 492. Implement master step 9b.3. Mark done when finished.
Do not run tests during agent work.
```

## Step 4 — Queue repo (required before PG-7)

- [x] done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/active/mobile-pg6.5-data-layer/04-queue-repo.md
Also read detail 493. Implement master step 9b.4 (native-cache projection stubs on mutations).
Mark done when finished. Do not run tests during agent work.
```

## Step 5 — Add-by-RSS parser-mapping + SQLite

- [x] done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/active/mobile-pg6.5-data-layer/05-add-by-rss-mapping.md
Also read detail 494. Implement master step 9b.5. No @podverse/parser. Mark done when finished.
Do not run tests during agent work.
```

## Step 6 — Visual primitives scaffold

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-pg6.5-data-layer/06-visual-primitives.md
Also read detail 495. Implement master step 9b.6. Mark done when finished.
Do not run tests during agent work.
```

## Step 7 — Opportunistic primitives migrate (final)

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-pg6.5-data-layer/07-primitives-migrate.md
Also read detail 496. Implement master step 9b.7. Mark done when finished.
On this final step, archive this plan set to .llm/plans/completed/mobile-pg6.5-data-layer/ and
end with the cumulative operator verification commands for the whole set.
Do not run tests during agent work.
```

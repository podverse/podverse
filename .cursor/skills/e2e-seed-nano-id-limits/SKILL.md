---
name: e2e-seed-nano-id-limits
description: E2E seed and fixture id_text values must fit nano_id_v2 (9–15 chars). Use when adding or renaming IDs in seed scripts, seedConstants, demo links, or E2E fixtures that insert into id_text columns.
---

# E2E seed `id_text` limits (`nano_id_v2`)

When adding deterministic E2E fixtures (seed SQL, `tools/**/seed-e2e.mjs`, demo URLs, or
`apps/**/e2e/helpers/seedConstants.ts`), every **`id_text`** must satisfy the Postgres
**`nano_id_v2`** domain.

## Limits

| Source     | Rule                                                                                  |
| ---------- | ------------------------------------------------------------------------------------- |
| DB domain  | `VARCHAR(15)` with `char_length` **9–15** (`0000_init_helpers.sql`)                   |
| TypeScript | `NANO_ID_V2_MIN_LENGTH` / `NANO_ID_V2_MAX_LENGTH` in `packages/orm/src/lib/nanoid.ts` |

**Do not** assume descriptive strings are valid just because they look like other E2E IDs.
Count characters before committing — a name one character too long fails at seed time with
`value too long for type character varying(15)`.

## Tables that use `nano_id_v2` for public IDs

Common E2E fixture targets (all share the same length rule):

- `item.id_text`, `channel.id_text`
- `playlist.id_text`, `queue.id_text`, `clip.id_text`
- `account.id_text` (and management admin `id_text`)

## Naming pattern for E2E fixtures

Follow existing short prefixes (typically **12–14** chars), not long readable phrases:

- Good: `e2ePodResume01` (13), `e2eEmbVidItem01` (14), `e2eEmbScrCh01` (13)
- Bad: `e2eEmbedVideoItem01` (18), `e2eEmbedScrollCh01` (16)

Prefer abbreviated segments (`Emb`, `Vid`, `Scr`, `Pl`, `Prv`) and two-digit suffixes
(`01`, `02`) so generated series (`e2eEmbScrIt01`–`10`) stay ≤ 15.

## Sync checklist

When introducing or renaming a fixture `id_text`, update **all** references together:

1. `tools/web/seed-e2e.mjs` (and `tools/management-web/seed-e2e.mjs` when applicable)
2. `apps/web/e2e/helpers/seedConstants.ts` (and management-web counterpart)
3. Any hardcoded demo URLs (e.g. `apps/web/src/lib/embed/embedDemoLinks.ts`)
4. Feature docs that list example routes/IDs
5. E2E specs — prefer importing from `seedConstants.ts` over inline string literals

## Verification

After changing seed IDs, run:

```bash
make e2e_seed_web
```

Seed failure on insert is almost always an `id_text` length or sync mismatch — fix length
first, then grep for stale string literals.

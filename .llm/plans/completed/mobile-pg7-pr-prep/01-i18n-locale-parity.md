# 01 — i18n locale parity for new `media_player` keys

## Goal

Bring `es` / `fr` / `el-GR` into key parity with `consumer/originals/en-US.json` for the new
full-player / mini-player strings so CI `npm run i18n:validate` passes.

## Context

Uncommitted `packages/i18n-catalog/consumer/originals/en-US.json` added leaves under
`media_player`, including at least:

- `no_media`, `livestream_unavailable`, `seek`, `skip_to_next`
- `up_next`, `up_next_empty`, `auto_queue`, `share`, `value_for_value`, `coming_soon`
- `sleep_timer.sleep_timer`, `sleep_timer.off`, `sleep_timer.minutes_15|30|60`

`i18n-validate.ts` requires every required locale’s originals to match en-US leaf keys, and
overrides to match that locale’s originals structure. Adding keys only to en-US fails CI
(`.github/workflows/i18n.yml`).

## Do

1. Confirm missing keys vs en-US for `consumer/originals/{es,fr,el-GR}.json` (and matching
   override files if structure updates are required).
2. From monorepo root, run the catalog pipeline (agent **may** run these i18n scripts — they are
   generation, not test gates):

```bash
npm run i18n:translate
npm run i18n:compile
npm run i18n:validate
```

   If `i18n:translate` needs network / API keys and fails in the agent sandbox, document exact
   operator commands and stop — do not hand-edit translations into non-en locales unless the
   project docs explicitly allow a minimal stub (prefer the translate script).

3. Ensure override files still match originals (empty-string overrides for new keys are fine per
   catalog README: empty override = use originals).
4. Do **not** commit. Leave generated/compiled outputs as the catalog scripts intend (compiled
   under apps is typically gitignored — do not force-add gitignored compile artifacts).

## Done when

- `npm run i18n:validate` exits 0.
- Non-en consumer originals contain the new `media_player` leaf keys (translated or
   script-generated).
- COPY-PASTA step 1 marked done.

## Out of scope

- Android Close investigation (`02`)
- Committing / opening a PR
- Adding new English product strings beyond what is already in the working tree

## Operator verify (this step)

```bash
npm run i18n:validate
npm run i18n:compile
```

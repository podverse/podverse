# 06 — E2E and closeout

**Cursor model:** Codex 5.3 · **Reasoning:** medium

Detail set 771–776 · Decisions: [00-SUMMARY.md](00-SUMMARY.md)

## E2E

Extend `apps/mobile/e2e/library-playlists.yaml` (or add a focused sibling flow) to cover what Maestro
can assert without flake:

- Library list loads; My / Followed chips switch (assert list root + chip testIDs)
- Create → detail → edit metadata → save → back
- Delete playlist (confirm dialog) when membership seed allows
- Do **not** assert long-press drag in Maestro — say why in a flow comment (same reason as queue:
  gesture arbitration is a device check). Swipe-remove may be asserted if stable; otherwise leave
  manual with a comment.

Keep Browse playlists coverage in `browse.yaml` as-is unless a testID renamed.

## i18n

Add `instructions.login_for_playlists` to consumer `en-US` (and run the usual i18n sync so other
locales get a stub) matching the generic login sentence peers for queues / history — web already
references this key. Confirm `features.playlist.*` keys used by new UI already exist; add only what
is missing. Sentence case throughout
([`ui-copy-sentence-case`](/.cursor/rules/ui-copy-sentence-case.mdc)).

## Master plan and archive

- Flip 771–776 to `done` in the Phase 2 master plan planned-steps table **and** the Appendix
- Leave 777 / 778 as `deferred` in Track P2.3
- Set P2.1.6 area status to `done` (or `done (core)`) if History-style pending does not apply —
  playlists area closes when this set finishes
- Update `.llm/plans/active/LLM-PLANS-ACTIVE.md` — remove this set from the index
- Archive this plan directory per [`plan-completion`](/.cursor/skills/plan-completion/SKILL.md)
  (move to `completed/` or delete per current Phase 2 policy — follow the skill; Phase 2 often
  removes completed sets rather than retaining archives)

## Cumulative verification

Assume the operator ran every earlier prompt without testing. End the response with **all**
cumulative verification commands for the whole set, deduped, build → unit → mobile Maestro, naming
Metro / iOS / Android / E2E API prerequisites in prose rather than in the paste block.

```bash
npm run build:packages
npm --prefix apps/mobile run test -- src/lib/rows/homeRowMappers.test.ts
npm --prefix apps/mobile run test -- src/data/repositories/playlistRepository.test.ts
npm run mobile:e2e:test -- library-playlists
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

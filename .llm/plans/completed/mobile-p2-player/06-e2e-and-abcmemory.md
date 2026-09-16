# 06 — E2E and abcmemory

Last step. Prove the screen with Maestro, write the constraint down where future work will hit it, and
close out the docs.

## New flow — `apps/mobile/e2e/player-screen.yaml`

Cover what the layout promises, in the order a user meets it:

1. Open the full player from the mini player.
2. Chips are visible peeking at the bottom before any scroll.
3. Scroll up: chips stick and the condensed bar appears with a working play/pause.
4. Scroll back: the player region is restored.
5. Press a chip (Chapters) and the pane loads; the transport row has not moved.
6. Press create clip and the "not available yet" message appears; dismiss it and nothing changed.
7. Open the More sheet and confirm its rows; cancel.
8. Open sleep timer and playback speed as sheets — no inline expansion.

Screenshot the states the operator asked about ([`mobile-e2e-screenshots`](/.cursor/skills/mobile-e2e-screenshots/SKILL.md)),
and keep timeouts inside the budget in **mobile-maestro-timeouts**.

## Update existing flows

- Remove the `full-player-two-column` assertion — that layout is gone.
- Anywhere a flow asserted an inline sleep timer or speed panel, assert the sheet instead.
- `play-mini-player.yaml` keeps its mini-player assertions; only add to it if the condensed bar changed
  how it dismisses.

## New rule — `.cursor/rules/mobile-player-fixed-region.mdc`

Scoped to `apps/mobile/src/screens/player/**` and `apps/mobile/src/components/player/**`. It carries
the one constraint that a future change will otherwise quietly break: **only the viewer flexes.**

- Every band outside the viewer is a constant height, and new player chrome gets a reserved band rather
  than a conditional one.
- New controls open sheets; nothing expands inline inside the region.
- Heights come from `fullPlayerLayout.ts`, not from ad-hoc style numbers.
- Video letterboxes inside the square; aspect ratio never resizes the box.

State it as a constraint on the code as it stands, with no plan or step numbers
([`comments-future-forward`](/.cursor/rules/comments-future-forward.mdc)).

## Update the playback skill

`.cursor/skills/mobile-playback/SKILL.md` gains the finished player: the fixed region and where its math
lives, the sticky chips and condensed bar, the shared 10/30 jump constants, `skipToPrevious` chapter
awareness, and the sheets that replaced the inline panels. Point at the new rule instead of restating it.

The placeholder guidance is already recorded in
[`deferred-feature-placeholders`](/.cursor/rules/deferred-feature-placeholders.mdc) — do not re-write it
here.

## Docs closeout

- Mark P2.1.4 done in `001-MASTER-PLAN-PHASE-2.md`; details 747–750 become implemented, 751 stays
  deferred.
- Move this plan set from `.llm/plans/active/` to the mirrored `completed/` path and update
  `.llm/plans/active/LLM-PLANS-ACTIVE.md` ([`plan-completion`](/.cursor/skills/plan-completion/SKILL.md)).

## Final response

This is the last prompt in the set, so end with **all** cumulative verification commands for the whole
set, deduped and ordered build → unit → mobile Maestro, including web unit/E2E for the shared jump
constant from step 02. Name **Mobile Metro**, **Mobile iOS** / **Mobile Android**, and **Mobile E2E API**
in prose rather than pasting leave-running commands into the block
([`response-ending-make-verify`](/.cursor/skills/response-ending-make-verify/SKILL.md)).

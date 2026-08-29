# mobile-pg13-operator-polish — summary

> **Resolution (2026-08-05): DECLINED as an agent phase — operator polishes manually.** The operator
> chose to do all Track 23 visual/UX polish **by hand**, screen by screen, without an agent-generated
> checklist scaffold (23.1) or agent apply-briefs pass (23.2). Those steps remain **optional
> agent-assist** only: the durable detail docs
> [595](/docs/proposals/mobile/_master-plan_/phase-2/details/595-operator-polish-checklist.md) /
> [596](/docs/proposals/mobile/_master-plan_/phase-2/details/596-operator-polish-apply-briefs.md) and the
> brief template in `02-apply-operator-briefs.md` stay available if the operator later wants agent
> help on a specific screen. Archived to `completed/` as reference. **Publish hold:** no alpha /
> internal / pre-beta test-track publish until the operator finishes this manual polish (master plan
> **Ship bar** § Publish hold).

**Parallel group:** PG-13 (Track 23 — operator visual polish). **Operator-led, manual.**
**Phase state:** declined as an agent phase (optional agent-assist only).

## Scope

Track 23 is where the mobile app moves from **functional sketches** to **operator-directed visual
finishing**, screen by screen. Agents implement **only** what written operator briefs specify — no
freestyle redesign, no new features (master plan **Ship bar** + **mobile-theme-parity**).

| Step | Detail | Model | This phase |
| --- | --- | --- | --- |
| 23.1 | [595-operator-polish-checklist](/docs/proposals/mobile/_master-plan_/phase-2/details/595-operator-polish-checklist.md) | Auto | **Agent-actionable now:** create the checklist **scaffold** doc (one row per screen, pass/fail + notes). Operator then walks screens and fills it. |
| 23.2 | [596-operator-polish-apply-briefs](/docs/proposals/mobile/_master-plan_/phase-2/details/596-operator-polish-apply-briefs.md) | Codex 5.3 | **Gated:** apply operator briefs to concrete files once briefs exist. Cannot start until 23.1 is filled and at least one brief is written. |
| 23.3 | [597-list-virtualization-polish](/docs/proposals/mobile/_master-plan_/phase-2/details/597-list-virtualization-polish.md) | Codex 5.3 | Part **(a)** baseline virtualization already **done** (`.llm/plans/completed/phase-1/mobile-list-virtualization/`). Part **(b)** FlashList/windowing *tuning* stays deferred — jank-gated, not part of this set. |

## Detail ID range

595, 596 (597 tracked separately; its required baseline is complete).

## Open decision locked

**Visual polish = operator-led (decided).** Agents deliver sketches during feature tracks; pixel /
layout finishing happens here from written briefs only. Recorded per **mobile-master-plan-phasing**
§ Ship bar and [DOCS-MOBILE-PROCESS-VISUAL-PARITY.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-VISUAL-PARITY.md).

## Why now

All mobile feature PGs (0–12, PG-9 tracks, PG-10 tablet) are `done` and archived. The feature bulk
is in place, so the Track 23 groundwork — a durable checklist the operator can walk on device — is
the correct next mobile artifact. This set produces that groundwork; it does **not** apply any polish
until the operator provides briefs.

## Guardrails

- **No freestyle polish.** Step 23.2 changes only what a brief names (spacing, typography, chrome,
  empty/error states). Unmentioned screens are left alone.
- **No new features / no design-heavy surfaces** (transcript panels, clip authoring, pixel DnD stay
  in Track 21 deferrals / 598 / 599).
- Colors/spacing/radii come from `@podverse/design-tokens` / theme factories — **no hardcoded hex**.
- `@podverse/ui` remains **forbidden** on mobile.
- E2E smoke for touched areas must stay green (operator verifies; agents do not run tests).

## Files

- `00-EXECUTION-ORDER.md` — sequence + the operator gate between 23.1 and 23.2.
- `01-polish-checklist-scaffold.md` — 23.1 scaffold (agent-actionable).
- `02-apply-operator-briefs.md` — 23.2 apply workflow + brief template (gated).
- `COPY-PASTA.md` — per-step prompts with **Cursor model**.

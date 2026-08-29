# 01 — Operator polish checklist scaffold (Track 23.1)

**Cursor model:** Auto
**Detail:** [595-operator-polish-checklist](/docs/proposals/mobile/_master-plan_/phase-2/details/595-operator-polish-checklist.md)
**Ship bar:** A durable, per-screen checklist **scaffold** exists that the operator can walk on a
device/simulator and fill in. This is a **template**, not applied polish — agents create the empty
grid + fields; the operator supplies the judgments and briefs.

## Why

Track 23 forbids agents from inventing final layouts. The one agent-actionable artifact for 23.1 is
the **structure** the operator fills: a row per screen with pass/fail and structured note fields, so
the eventual briefs (23.2) map cleanly to concrete file changes. No aesthetics are decided here.

## Deliverable

Create a new doc (recommended path — operator may relocate):

`docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-OPERATOR-POLISH-CHECKLIST.md`

### Required contents

1. **Header banner** stating: functional-sketch phase is over for briefed screens; **no agent
   freestyle polish** — agents apply only written briefs in 23.2. Link back to
   [DOCS-MOBILE-PROCESS-VISUAL-PARITY.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-VISUAL-PARITY.md)
   and master plan **Track 23**.
2. **One row per screen** from master plan **Appendix A — Screen map**, plus the phone/tablet and
   player variants. At minimum:
   - Home, Podcast detail, Episode detail, Album detail, Artist detail, Clip detail, Search,
     Playlists, Playlist create/edit, Playlist detail, Queue, History, My clips, Public profile,
     My profile, Add by RSS, Settings.
   - Player surfaces: MiniPlayer, FullPlayer (phone), FullPlayer two-column (tablet).
   - Tablet home grid + split detail (PG-10) as their own rows.
3. **Columns per row** (fields the operator fills, left blank by the agent):
   - `Status` (pass / fail / needs-brief)
   - `Layout & density notes`
   - `Spacing / typography`
   - `Chrome / header / nav`
   - `Empty / loading / error states`
   - `Brief written? (y/n + link)`
4. **Device matrix reminder:** note that each screen should be eyeballed on iOS phone, Android phone,
   and tablet (per [DOCS-MOBILE-DEVICE-MATRIX.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DEVICE-MATRIX.md)).
5. **Brief template pointer:** link to `02-apply-operator-briefs.md` so the operator writes briefs in
   the format agents consume.

## Guards / gotchas

- **Do not** fill in any opinions, layout notes, or pass/fail values — leave every operator field
  blank. The agent only builds the empty structure + instructions.
- **Do not** change any product code or styles in this step.
- Keep screen names/paths consistent with Appendix A (do not invent screens that do not exist).
- Follow **documentation-conventions** for the doc header/filename; keep it a single new file (no
  duplicate index; respect single-source doc rules).

## Acceptance

- The checklist doc exists with a row for every Appendix A screen + player/tablet variants and the
  six operator fields per row, all blank.
- The "no freestyle polish until briefs" banner is present and links to the parity doc + Track 23.
- No product/style code changed.

## After this step

- Mark 23.1 `done` (this scaffold is the 23.1 deliverable), update Appendix C row 595 → `done`, set
  `595-operator-polish-checklist.md` header to `**Status:** done`.
- Leave 23.2 `planned` (gated on operator briefs). Do **not** add ` (DONE)` to the Track 23 heading
  yet (23.2 / 23.3(b) remain open).

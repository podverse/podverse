# COPY-PASTA — P2.1.4 player screen

One prompt per response, in order. Order and rationale:
[00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md) · Decisions: [00-SUMMARY.md](00-SUMMARY.md)

Do not run tests during these prompts; each response ends with operator verification commands. Mark
each box when its prompt completes.

- [x] **01 — Layout math**
- [x] **02 — Previous & jumps**
- [x] **03 — Chrome rows & sheets**
- [x] **04 — Fixed region & scroll shell**
- [x] **05 — Chips & panes**
- [x] **06 — E2E & abcmemory**

---

## 01 — Layout math

**Cursor model:** Codex 5.3 · **Reasoning:** high

```
Implement .llm/plans/active/mobile-p2-player/01-player-layout-math.md.

Add apps/mobile/src/screens/player/fullPlayerLayout.ts with the fixed band constants,
resolveFullPlayerLayout, and resolveCondensedState, plus fullPlayerLayout.test.ts covering the cases
the plan lists. Pure module and tests only — do not touch FullPlayerScreen.tsx or any component.
```

---

## 02 — Previous & jumps

**Cursor model:** Opus 5 · **Reasoning:** high

```
Implement .llm/plans/active/mobile-p2-player/02-transport-previous-and-jumps.md.

Change MEDIA_JUMP_BACK_SECONDS from 15 to 10 in packages/helpers (web's jump buttons read it, so web
changes with mobile — check web E2E for a stale "15 seconds" assertion). Add skipToPrevious and jumpBy
to PlaybackProvider with the pure resolvers resolvePreviousAction and resolveJumpTarget, and their
tests. No UI in this step.
```

---

## 03 — Chrome rows & sheets

**Cursor model:** Codex 5.3 · **Reasoning:** high

```
Implement .llm/plans/active/mobile-p2-player/03-player-chrome-rows-and-sheets.md.

Add FullPlayerActionRow, FullPlayerTransportRow, FullPlayerUtilityRow, and FullPlayerMoreSheet, and
convert the inline sleep timer, playback speed, and up next panels into MoreMenu sheets (deleting the
inline panel state and styles). Wire add to playlist, share, and queue to the existing code paths.
Create clip is a pressable placeholder that shows a "not available yet" message on press and changes
nothing — follow .cursor/rules/deferred-feature-placeholders.mdc. Reuse PlayerTransportButton for
play/pause. No layout math or scrolling yet.
```

---

## 04 — Fixed region & scroll shell

**Cursor model:** Opus 5 · **Reasoning:** high

```
Implement .llm/plans/active/mobile-p2-player/04-fixed-region-and-scroll-shell.md.

Rebuild FullPlayerScreen as a SectionList: the player region is a fixed-height header sized by
resolveFullPlayerLayout, chips peek and stick, and the condensed bar appears via resolveCondensedState.
Video letterboxes inside the artwork square; the episode title marquees on one line and holds still
under reduce-motion; keep the CoverImage lightbox. Retire the two-column tablet layout and its
full-player-two-column assertion. Wire only the Summary pane in this step.
```

---

## 05 — Chips & panes

**Cursor model:** Codex 5.3 · **Reasoning:** high

```
Implement .llm/plans/active/mobile-p2-player/05-section-chips-and-panes.md.

Extract EpisodeDetailScreen's per-pane loading into a shared hook and have episode detail use it in the
same change — extract, do not copy. Render the five chips with episode detail's evidence-based
visibility and its item-scoped selection pref, and render each pane in the SectionList. When the
now-playing item changes, scroll back to the player and load the new item's remembered chip.
```

---

## 06 — E2E & abcmemory

**Cursor model:** Codex 5.3 · **Reasoning:** medium

```
Implement .llm/plans/active/mobile-p2-player/06-e2e-and-abcmemory.md.

Add apps/mobile/e2e/player-screen.yaml, update the flows that asserted the two-column layout or inline
panels, add .cursor/rules/mobile-player-fixed-region.mdc, update the mobile-playback skill, mark P2.1.4
done in the Phase 2 master plan, and archive this plan set to completed/.

Assume I ran every earlier prompt without testing: end the response with ALL cumulative verification
commands for the whole set, deduped, build → unit → mobile Maestro, including web verification for the
shared jump constant.
```

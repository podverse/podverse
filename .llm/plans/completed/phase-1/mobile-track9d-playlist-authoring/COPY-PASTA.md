# COPY-PASTA — mobile-track9d-playlist-authoring (PG-6.7)

Run prompts **1 → 3** in order. Each prompt: read its plan file + detail docs, implement, mark
master-plan steps + Appendix C + detail headers `done`, check the box. **Do not run tests during
agent work.**

**Ship bar:** functional sketches only — no pixel polish, no fancy DnD, no clip authoring
(21.4 / 21.12 / Track 23).

Follow **mobile-theme-parity**, **i18n-user-facing-strings**, **mobile-surface-async-errors**.

Prerequisite: Track 9 playlists list/detail + Track 9c done. Prefer running **after**
`mobile-track11-video` (or in parallel if separate worktree — see **mobile-worktree-scope**).

---

## Step 1 — Create + edit playlist screens

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-track9d-playlist-authoring/01-create-edit-playlist-screens.md
Also read details 590–591. Implement master steps 9d.1–9d.2.
Mark done when finished. Do not run tests during agent work.
```

---

## Step 2 — Reorder + add-to-playlist

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-track9d-playlist-authoring/02-reorder-and-add-to-playlist.md
Also read details 592–593. Implement master steps 9d.3–9d.4.
Mark done when finished. Do not run tests during agent work.
```

---

## Step 3 — Header back + E2E smoke (final)

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-track9d-playlist-authoring/03-header-back-and-e2e-smoke.md
Also read detail 594. Implement master step 9d.5.
Archive this plan set when finished. Do not run tests during agent work.
```

---

## After all complete (operator)

```bash
npm run mobile:e2e:test -- library-playlists
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
npm --prefix apps/mobile run test
```

If `library-playlists` area was not added, use the closest library Maestro area or manual verify
create/edit/reorder on device.

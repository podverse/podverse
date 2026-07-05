# COPY-PASTA — mobile master plan authoring

Execute prompts in order. Mark `[x]` when complete. Move completed numbered files to
`.llm/plans/completed/mobile-master-plan/` when the full set is done.

## CRITICAL: Execution rules

- **Phase A is sequential:** run Prompt 1 alone; **wait for completion** before Phase B.
- **Phase B is parallel:** run Prompts 2–10 simultaneously (9 agents); **wait for all** before
  Phase C.
- **Phase C is sequential:** run Prompt 11 alone after Phase B completes.
- **Docs only:** create/update markdown under `docs/proposals/mobile/_master-plan_/`.
- **Do not** create files under `details/` except as linked placeholders in the master plan text.
- **Model column:** each draft step must include `Model: Auto|Codex 5.3|Opus 4.8` per authoring file.

## Recommended Cursor model (this plan set)

| Prompt | Model | Notes |
| ------ | ----- | ----- |
| 1 | **Auto** | Transcribe Tracks 0,1,3,5 tables |
| 2–10 | **Auto** | Transcribe parallel track tables |
| 11 | **Opus 4.8** | Assemble, verify, parallel groups |

After assembly, use each step's **Model** when writing detail plans and implementing (see
[00-SUMMARY.md](00-SUMMARY.md)).

---

## Phase A — Foundation (1 agent, **Auto**)

### Prompt 1

```
Read and execute .llm/plans/active/mobile-master-plan/01-authoring-foundation-and-tooling.md

Author Tracks 0, 1, 3, and 5 for the mobile master plan. Write output to
docs/proposals/mobile/_master-plan_/_draft-tracks/track-00-01-03-05.md.
Follow numbering, one-sentence summaries, Model field, and placeholder detail links exactly.
Docs only — no production code changes.
```

**Cursor model:** Auto

- [x] **Prompt 1** complete

---

## Phase B — Parallel Track authoring (9 agents, **Auto** each)

**Start all prompts below only after Prompt 1 is complete.**

### Prompt 2 — Track 2 (media engine)

```
Read and execute .llm/plans/active/mobile-master-plan/02-authoring-native-media-engine.md

Author Track 2. Write to docs/proposals/mobile/_master-plan_/_draft-tracks/track-02.md.
Include Model on every step. Docs only.
```

**Cursor model:** Auto

- [x] **Prompt 2** complete

### Prompt 3 — Tracks 4, 22 (CI/release)

```
Read and execute .llm/plans/active/mobile-master-plan/03-authoring-cicd-release-store-safety.md

Author Tracks 4 and 22. Write to docs/proposals/mobile/_master-plan_/_draft-tracks/track-04-22.md.
Include Model on every step. Docs only.
```

**Cursor model:** Auto

- [x] **Prompt 3** complete

### Prompt 4 — Tracks 6, 7, 8 (shell/nav/home)

```
Read and execute .llm/plans/active/mobile-master-plan/04-authoring-app-shell-nav-home.md

Author Tracks 6, 7, and 8. Write to docs/proposals/mobile/_master-plan_/_draft-tracks/track-06-08.md.
Include Model on every step. Docs only.
```

**Cursor model:** Auto

- [x] **Prompt 4** complete

### Prompt 5 — Track 9 (browse/content)

```
Read and execute .llm/plans/active/mobile-master-plan/05-authoring-browse-content-screens.md

Author Track 9. Write to docs/proposals/mobile/_master-plan_/_draft-tracks/track-09.md.
Include Model on every step. Docs only.
```

**Cursor model:** Auto

- [x] **Prompt 5** complete

### Prompt 6 — Tracks 10, 11 (playback/queue)

```
Read and execute .llm/plans/active/mobile-master-plan/06-authoring-playback-queue-parity.md

Author Tracks 10 and 11. Write to docs/proposals/mobile/_master-plan_/_draft-tracks/track-10-11.md.
Include Model on every step. Docs only.
```

**Cursor model:** Auto

- [x] **Prompt 6** complete

### Prompt 7 — Track 12 (car layer)

```
Read and execute .llm/plans/active/mobile-master-plan/07-authoring-car-layer.md

Author Track 12. Write to docs/proposals/mobile/_master-plan_/_draft-tracks/track-12.md.
Include Model on every step. Docs only.
```

**Cursor model:** Auto

- [x] **Prompt 7** complete

### Prompt 8 — Tracks 13–17 (mobile-only)

```
Read and execute .llm/plans/active/mobile-master-plan/08-authoring-mobile-only-features.md

Author Tracks 13 through 17. Write to docs/proposals/mobile/_master-plan_/_draft-tracks/track-13-17.md.
Include Model on every step. Docs only.
```

**Cursor model:** Auto

- [x] **Prompt 8** complete

### Prompt 9 — Track 18 (multi-device)

```
Read and execute .llm/plans/active/mobile-master-plan/09-authoring-multi-device-targets.md

Author Track 18. Write to docs/proposals/mobile/_master-plan_/_draft-tracks/track-18.md.
Include Model on every step. Docs only.
```

**Cursor model:** Auto

- [x] **Prompt 9** complete

### Prompt 10 — Tracks 19–21 (membership/FOSS/deferrals)

```
Read and execute .llm/plans/active/mobile-master-plan/10-authoring-membership-fdroid-deferrals.md

Author Tracks 19, 20, and 21. Write to docs/proposals/mobile/_master-plan_/_draft-tracks/track-19-21.md.
Include Model on every step. Docs only.
```

**Cursor model:** Auto

- [x] **Prompt 10** complete

---

## Phase C — Assemble (1 agent, **Opus 4.8**)

### Prompt 11

```
Read and execute .llm/plans/active/mobile-master-plan/11-authoring-assemble-and-finalize.md

Stitch all _draft-tracks/*.md into docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md.
Add parallel-group annotations, dependency notes, open decisions, and Model on every step.
Verify every step has a placeholder detail link. Docs only.
```

**Cursor model:** Opus 4.8

- [x] **Prompt 11** complete

---

## Operator verification (after Prompt 11)

```bash
test -f docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md
grep -c 'Detail:' docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md
grep -c 'Model:' docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md
ls docs/proposals/mobile/_master-plan_/_draft-tracks/
```

# Execution order — mobile-pg13-operator-polish

Track 23 has an **operator gate** in the middle: an agent builds the checklist scaffold, the operator
fills it on-device and writes briefs, then an agent applies those briefs. The two agent steps are
**not** back-to-back.

| # | Phase | File | Actor | Gate |
| --- | --- | --- | --- | --- |
| 1 | Checklist scaffold (23.1) | [`01-polish-checklist-scaffold.md`](./01-polish-checklist-scaffold.md) | **Agent** (Auto) | none — runnable now |
| — | Walk screens, fill checklist, write per-screen briefs | (operator, on device/simulator) | **Operator** | requires step 1 doc |
| 2 | Apply operator briefs (23.2) | [`02-apply-operator-briefs.md`](./02-apply-operator-briefs.md) | **Agent** (Codex 5.3) | **blocked** until ≥1 brief exists |

## Notes

- Step 2 is **per-brief / batched**: run it once per screen (or small batch) the operator has
  briefed, not as one giant pass. Repeat until the checklist is worked through.
- Do **not** implement step 2 speculatively. If no brief text exists for a screen, that screen is
  out of scope for this pass.
- 23.3(b) (FlashList/windowing tuning) is **not** in this set; only open it if the operator flags
  jank after polish. 23.3(a) baseline is already done.

Use [`COPY-PASTA.md`](./COPY-PASTA.md) for one-block-at-a-time execution.

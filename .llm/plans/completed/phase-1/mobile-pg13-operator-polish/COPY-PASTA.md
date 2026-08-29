# COPY-PASTA — mobile-pg13-operator-polish

Track 23 has an **operator gate**: run **Step 1** (agent), then the operator walks screens on-device
and writes briefs, then run **Step 2** (agent) per briefed screen/batch.
**Agents: implement only — do not run tests.** The operator runs verification.

## Prompts

- [ ] **Step 1 — Operator polish checklist scaffold (Track 23.1).**

**Cursor model:** Auto — docs-only scaffold (empty grid + fields; no product code).

```text
Read and execute .llm/plans/active/mobile-pg13-operator-polish/01-polish-checklist-scaffold.md
Create the per-screen operator polish checklist scaffold doc (one row per Appendix A screen + player
and tablet variants; six blank operator fields per row; "no freestyle polish until briefs" banner).
Do not fill in opinions and do not change any product code. Mark 23.1 done: flip Appendix C row 595
and the 23.1 step line to done, set 595 header to Status: done. Do not run tests.
```

> **Operator gate (no agent prompt):** open the checklist on iOS phone, Android phone, and a tablet.
> Fill pass/fail + notes per screen and write per-screen **briefs** using the template in
> `02-apply-operator-briefs.md`. Step 2 stays blocked until at least one brief exists.

- [ ] **Step 2 — Apply operator briefs (Track 23.2).** _(repeat per briefed screen/batch)_

**Cursor model:** Codex 5.3 — targeted RN style/layout changes from written briefs only.

```text
Read and execute .llm/plans/active/mobile-pg13-operator-polish/02-apply-operator-briefs.md
Apply ONLY the operator brief(s) for <screen(s)>: spacing/typography/chrome/empty-error via tokens +
primitives; keep testIDs, virtualization, and behavior; touch no unbriefed screen. Update the
checklist row Status. When the operator declares the checklist worked through and all briefed screens
are applied, mark 23.2 done (Appendix C row 596 + step line + detail header). Do not run tests.
```

## Leave-running (named tabs — only needed for Step 2 E2E)

Step 1 is docs-only (no devices needed). For Step 2 verification:

**Mobile Metro**

```bash
npm run mobile:dev
```

**Mobile iOS** / **Mobile Android** (install once; rebuild after style changes)

```bash
npm run mobile:e2e:ios
npm run mobile:e2e:android
```

## After a briefed batch (operator verification)

**Mobile Maestro** — focused to the polished area(s):

```bash
npm run mobile:e2e:test -- <area>
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

Full-suite smoke only if polish touched many areas:

```bash
npm run mobile:e2e:test:all
```

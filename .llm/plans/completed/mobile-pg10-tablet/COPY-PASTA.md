# COPY-PASTA — mobile-pg10-tablet

Paste prompts in order. **02 must be implemented before 03/04** (it delivers the `useResponsive`
hook). 01 (docs) may go first or in parallel. After each prompt: mark affected master-plan steps
`done` (Tracks + Appendix C + detail header) and check the box here. **Do not run tests during
agent work** — operator verifies at the end.

**Ship bar:** functional sketch + component reuse; phone layout unchanged behind every
`!isTablet` branch. No redesign (Track 23). Follow **mobile-master-plan-phasing**,
**parallel-plan-execution**, **response-ending-make-verify**.

---

## Step 1 — Device matrix + track scope docs (18.1, 18.15)

- [x] done

**Cursor model:** Auto

```text
Read and execute .llm/plans/active/mobile-pg10-tablet/01-device-docs.md
Create the device matrix + device/track scope docs and link them from APPS-MOBILE.md. Docs only.
Mark 18.1 and 18.15 done (Tracks + Appendix C + detail headers 510/535). Do not run tests during agent work.
```

---

## Step 2 — Responsive breakpoints + Home/browse grid (18.2)

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-pg10-tablet/02-responsive-home-grid.md
Add breakpoints tokens + useResponsive() hook, drive Home/browse FlatList columns from it, and add a
resolveColumns unit test to vitest.config.ts include. Mark 18.2 done (Tracks + Appendix C + detail 511).
Do not run tests during agent work.
```

---

## Step 3 — Tablet split detail + player layout (18.3, 18.4)

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-pg10-tablet/03-tablet-detail-and-player.md
Add the tablet split podcast-detail layout and the width-capped mini / two-column full player behind
isTablet, reusing existing components (phone unchanged). Mark 18.3 and 18.4 done (Tracks + Appendix C +
details 512/513). Do not run tests during agent work.
```

---

## Step 4 — Maestro tablet screenshots (18.5)

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-pg10-tablet/04-tablet-e2e-screenshots.md
Add the opt-in Maestro tablet flow + tablet device provisioning (iPad + Android tablet), screenshot Home
and podcast detail, and document it. Mark 18.5 done (Tracks + Appendix C + detail 514). Archive this plan
set when finished. Do not run tests during agent work.
```

---

## After all complete (operator)

```bash
npm run build:packages
npm run lint
npm run test -w apps/mobile
npm run mobile:e2e:test -- tablet
open .artifacts/mobile-e2e-reports/latest/ios-tablet/index.html
```

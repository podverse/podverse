# COPY-PASTA — mobile-track15-deep-links (PG-9 / Track 15)

Run prompts **1 → 4** in order. Each prompt: read its plan file + detail docs, implement, mark
master-plan steps + Appendix C + detail headers `done`, check the box. **Do not run tests during
agent work.**

**Ship bar:** universal/App Links open the correct screen; web-parity share URLs; cold-start replay.
No Track 23 polish.

**Do this track before Track 14** — push tap routing (14.4) reuses the 452 path map + 453 cold-start
replay.

Follow **routing-url-params**, **reusable-components**, **i18n-user-facing-strings**,
**mobile-surface-async-errors**, **mobile-e2e-screenshots**, **mobile-expo-monorepo**.

---

## Step 1 — Native universal/App Links config (15.1, 15.2)

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-track15-deep-links/01-native-link-config.md
Also read details 450, 451. Implement master steps 15.1-15.2.
Mark done when finished. Do not run tests during agent work.
```

---

## Step 2 — Path map + cold-start replay (15.3, 15.4)

- [x] done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/active/mobile-track15-deep-links/02-path-map-and-cold-start.md
Also read details 452, 453. Implement master steps 15.3-15.4.
Mark done when finished. Do not run tests during agent work.
```

---

## Step 3 — Share URL parity (15.5)

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-track15-deep-links/03-share-url-parity.md
Also read detail 454. Implement master step 15.5.
Mark done when finished. Do not run tests during agent work.
```

---

## Step 4 — E2E deep-link screenshot (15.6) — final

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-track15-deep-links/04-e2e-deep-link.md
Also read detail 455. Implement master step 15.6.
Archive this plan set when finished. Do not run tests during agent work.
```

---

## After all complete (operator)

Operator-only native verification (not agent code): host `apple-app-site-association` +
`/.well-known/assetlinks.json` on web infra; enable Associated Domains (Apple) + App Links (Play
Console).

Leave-running tabs per HOW-TO-RUN + **vscode-terminals-commands**: **Mobile Metro**
(`mobile:dev:e2e`), **Mobile E2E API**, **Mobile iOS** / **Mobile Android** install as needed.

**Mobile Maestro:**

```bash
npm run mobile:e2e:test -- deep-link
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
npm run test -w apps/mobile
```

# COPY-PASTA — mobile-track13-downloads (PG-9 / Track 13)

Run prompts **1 → 5** in order. Each prompt: read its plan file + detail docs, implement, mark
master-plan steps + Appendix C + detail headers `done`, check the box. **Do not run tests during
agent work.**

**Ship bar:** functional offline downloads sketch — no Track 23 polish. Native cache storage
remains Track 12 (projection stubs OK).

**Eligibility (locked):** reject `item.live_item` (any status) and HLS/m3u8; download progressive
formats per helpers `itemEnclosure` maps — see MOBILE-ONLY-FEATURES §1.1–1.2 and detail 430.

Follow **mobile-data-layer**, **mobile-theme-parity**, **i18n-user-facing-strings**,
**mobile-surface-async-errors**, **mobile-carplay-android-auto** (projection on mutate).

Prerequisite: Track 9b data layer + engine `file://` playback (2.26) done.

---

## Step 1 — Design + storage + schema

- [x] done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/active/mobile-track13-downloads/01-design-storage-schema.md
Also read details 430–432. Implement master steps 13.1–13.3.
Mark done when finished. Do not run tests during agent work.
```

---

## Step 2 — Episode download + library list

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-track13-downloads/02-episode-download-and-library-list.md
Also read details 433–434. Implement master steps 13.4–13.5.
Mark done when finished. Do not run tests during agent work.
```

---

## Step 3 — Play from download + cache projection

- [x] done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/active/mobile-track13-downloads/03-playback-and-cache-projection.md
Also read details 435 and 438. Implement master steps 13.6 and 13.9.
Mark done when finished. Do not run tests during agent work.
```

---

## Step 4 — Quota + auto-delete

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-track13-downloads/04-quota-and-auto-delete.md
Also read details 436–437. Implement master steps 13.7–13.8.
Mark done when finished. Do not run tests during agent work.
```

---

## Step 5 — E2E offline play (final)

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-track13-downloads/05-e2e-offline-play.md
Also read detail 439. Implement master step 13.10.
Archive this plan set when finished. Do not run tests during agent work.
```

---

## After all complete (operator)

Leave-running tabs per HOW-TO-RUN + **vscode-terminals-commands**: **Mobile Metro**
(`mobile:dev:e2e`), **Mobile E2E API**, **Mobile E2E test-assets** (if enclosure from assets),
**Mobile iOS** / **Mobile Android** install as needed.

**Mobile Maestro:**

```bash
npm run mobile:e2e:test -- library-downloads
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
npm --prefix apps/mobile run test
```

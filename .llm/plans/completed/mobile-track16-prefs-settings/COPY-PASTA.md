# COPY-PASTA — mobile-track16-prefs-settings (PG-9 / Track 16)

Run prompts **1 → 3** in order (all sequential). Each prompt: read its plan file + detail doc,
implement, mark master-plan steps + Appendix C + detail header `done`, check the box. **Do not run
tests during agent work.**

**Ship bar:** functional unified prefs store + Settings screen (theme, locale, playback, notification
toggles) + server sync for synced keys. No Track 23 polish; no freestyle redesign.

**Locked:** AsyncStorage (no MMKV v1); theme ids `dark, light, dracula, violet, ember, dawn`;
distinct `pmt` playback key (mobile home-tab `preferred_media_type` stays separate); synced keys =
`pmt` + locale + listen-stats + notification-types; device-only = theme, auto-queue, filters,
downloads, home-tab; DB wins on login reconcile.

Follow **mobile-data-layer**, **mobile-theme-parity**, **i18n-user-facing-strings**,
**mobile-surface-async-errors**, **prefer-named-exports**.

Prerequisite: Track 7.11–7.16 theme scaffold + Track 17 i18n + account-settings API (all done).

---

## Step 1 — Unified device prefs store (16.1)

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-track16-prefs-settings/01-prefs-store.md
Also read detail 460. Implement master step 16.1.
Mark done when finished. Do not run tests during agent work.
```

---

## Step 2 — Prefs server sync (16.2)

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-track16-prefs-settings/02-prefs-server-sync.md
Also read detail 461. Implement master step 16.2.
Mark done when finished. Do not run tests during agent work.
```

---

## Step 3 — Settings screen (16.3) — final

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-track16-prefs-settings/03-settings-screen.md
Also read detail 462. Implement master step 16.3.
Then append " (DONE)" to the Track 16 heading (16.1-16.10 all done), and archive this plan set.
Do not run tests during agent work.
```

---

## After all complete (operator)

Leave-running tabs per HOW-TO-RUN + **vscode-terminals-commands**: **Mobile Metro**
(`mobile:dev:e2e` for API-backed sync), **Mobile E2E API**, **Mobile iOS** / **Mobile Android**
install as needed.

**Mobile Maestro:**

```bash
npm run mobile:e2e:test -- locale-switch-home-smoke
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
npm run test -w apps/mobile
```

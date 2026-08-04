# COPY-PASTA — mobile-track14-push (PG-9 / Track 14)

Run prompts **1 → 4** in order. Each prompt: read its plan file + detail docs, implement, mark
master-plan steps + Appendix C + detail headers `done`, check the box. **Do not run tests during
agent work.**

**Ship bar:** playstore FCM (register, locale, permission, tap routing) + FOSS UnifiedPush transport
wired. Gradle flavors remain Track 20. No Track 23 polish.

**Prerequisite:** **Track 15 (`mobile-track15-deep-links`) must be `done` before Step 3** — tap
routing reuses 452 path map + 453 cold-start replay.

Follow **mobile-expo-monorepo**, **mobile-fdroid-flavors**, **mobile-surface-async-errors**,
**routing-url-params**, **i18n-user-facing-strings**, **mobile-e2e-screenshots**.

---

## Step 1 — FCM integration + register + locale + permission (14.1, 14.2, 14.3, 14.5)

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-track14-push/01-fcm-register-permission.md
Also read details 440, 441, 442, 444. Implement master steps 14.1, 14.2, 14.3, 14.5.
Mark done when finished. Do not run tests during agent work.
```

---

## Step 2 — UnifiedPush FOSS transport + missing wrappers (14.6)

- [x] done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/active/mobile-track14-push/02-unifiedpush-foss.md
Also read detail 445. Implement master step 14.6.
Mark done when finished. Do not run tests during agent work.
```

---

## Step 3 — Notification tap routing (14.4) — needs Track 15 done

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-track14-push/03-tap-routing.md
Also read detail 443 (and Track 15 details 452, 453). Implement master step 14.4.
Confirm Track 15 (452, 453) is done first. Mark done when finished. Do not run tests during agent work.
```

---

## Step 4 — FOSS register doc + E2E push-routing stub (14.7, 14.8) — final

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-track14-push/04-foss-register-and-e2e.md
Also read details 446, 447. Implement master steps 14.7, 14.8.
Archive this plan set when finished. Do not run tests during agent work.
```

---

## After all complete (operator)

Operator-only (not agent code): Firebase project + `google-services.json` /
`GoogleService-Info.plist` + APNs key; FOSS signing + F-Droid metadata (Track 20).

Leave-running tabs per HOW-TO-RUN + **vscode-terminals-commands**: **Mobile Metro**
(`mobile:dev:e2e`), **Mobile E2E API**, **Mobile iOS** / **Mobile Android** install as needed.

**Build + Mobile Maestro:**

```bash
npm run build:packages
npm run mobile:e2e:test -- push
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
npm run test -w apps/mobile
```

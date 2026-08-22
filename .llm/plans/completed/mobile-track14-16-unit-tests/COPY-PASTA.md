# COPY-PASTA — mobile-track14-16-unit-tests

Run prompts **1 → 2** in order. Each: read its plan file, implement the pure-core extraction (if
any) + tests, add the new test files to `apps/mobile/vitest.config.ts` `include`, check the box.
**Do not run tests during agent work.**

**Ship bar:** node-only vitest coverage for Track 14–16 pure logic (routing map, notification target,
share URL, prefs store). Behavior-preserving extractions only.

Follow **unit-test-priority-confident**, **unit-test-design-no-overgranularity**,
**import-specifiers-tiered**.

---

## Step 1 — Deep-link path map + notification-target tests (15.3, 14.4/14.8)

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-track14-16-unit-tests/01-routing-and-push-target-tests.md
Extract the pure notification-target helper, add deepLinking + notificationTarget tests, and register
them in apps/mobile/vitest.config.ts include. Mark done when finished. Do not run tests during agent work.
```

---

## Step 2 — Share-URL parity + prefs store tests (15.5, 16.1)

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-track14-16-unit-tests/02-share-and-prefs-tests.md
Extract the pure share-URL core, add shareUrl + prefsStore tests (vi.mock AsyncStorage), and register
them in apps/mobile/vitest.config.ts include. Archive this plan set when finished. Do not run tests
during agent work.
```

---

## After all complete (operator)

```bash
npm run build:packages
npm run lint
npm run test -w apps/mobile
```

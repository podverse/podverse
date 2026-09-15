# COPY-PASTA — Library Downloads + Settings storage

Paste one prompt per agent session, **top to bottom**. Locked decisions:
[00-SUMMARY.md](00-SUMMARY.md). Order: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).

Agents do **not** run tests during implementation — the operator verifies at the end.

| #  | Prompt                         | Cursor model | Reasoning |
| -- | ------------------------------ | ------------ | --------- |
| 01 | Chrome and primitives          | Codex 5.3    | medium    |
| 02 | Download engine                | Opus 5       | high      |
| 03 | Settings Downloads             | Codex 5.3    | medium    |
| 04 | Downloads list screen          | Codex 5.3    | medium    |
| 05 | Home footer and download banner| Codex 5.3    | medium    |
| 06 | E2E and i18n                   | Codex 5.3    | medium    |

---

- [x] **01 — Chrome and primitives**

**Cursor model:** Codex 5.3
**Reasoning:** medium

```
Read and execute .llm/plans/active/mobile-p2-library-downloads/01-chrome-and-primitives.md

Follow details 731 and 735 and locked decisions in 00-SUMMARY.md.

Do not run tests during agent work; leave operator verification commands at the end.
```

---

- [x] **02 — Download engine**

**Cursor model:** Opus 5
**Reasoning:** high

```
Read and execute .llm/plans/active/mobile-p2-library-downloads/02-download-engine.md

Follow detail 734 and locked decisions in 00-SUMMARY.md. Do not put downloads in the sync queue.

Do not run tests during agent work; leave operator verification commands at the end.
```

---

- [x] **03 — Settings Downloads**

**Cursor model:** Codex 5.3
**Reasoning:** medium

```
Read and execute .llm/plans/active/mobile-p2-library-downloads/03-settings-downloads.md

Follow detail 732 and locked decisions in 00-SUMMARY.md.

Do not run tests during agent work; leave operator verification commands at the end.
```

---

- [x] **04 — Downloads list screen**

**Cursor model:** Codex 5.3
**Reasoning:** medium

```
Read and execute .llm/plans/active/mobile-p2-library-downloads/04-downloads-list.md

Follow detail 733 and locked decisions in 00-SUMMARY.md.

Do not run tests during agent work; leave operator verification commands at the end.
```

---

- [x] **05 — Home footer and download banner**

**Cursor model:** Codex 5.3
**Reasoning:** medium

```
Read and execute .llm/plans/active/mobile-p2-library-downloads/05-home-footer-and-banner.md

Follow details 736 and 734 (banner) and locked decisions in 00-SUMMARY.md.

Do not run tests during agent work; leave operator verification commands at the end.
```

---

- [x] **06 — E2E and i18n**

**Cursor model:** Codex 5.3
**Reasoning:** medium

```
Read and execute .llm/plans/active/mobile-p2-library-downloads/06-e2e-and-i18n.md

Follow locked decisions in 00-SUMMARY.md. Update Maestro flows and catalog keys.

Do not run tests during agent work; leave operator verification commands at the end.
```

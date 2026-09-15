# COPY-PASTA — Home subscribed chips + discovery CTAs

Paste **top to bottom**. Wait for each prompt to finish.

Locked decisions: [00-SUMMARY.md](00-SUMMARY.md). Order: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).

Agents do **not** run tests during implementation.

| #  | Prompt                         | Cursor model | Reasoning |
| -- | ------------------------------ | ------------ | --------- |
| 01 | Kind + subscribed Home loaders | Codex 5.3    | high      |
| 02 | Empty CTAs + Browse/Search     | Codex 5.3    | medium    |
| 03 | Filter + E2E + docs            | Codex 5.3    | medium    |

---

- [x] **01 — Kind + subscribed Home loaders**

**Cursor model:** Codex 5.3
**Reasoning:** high

```
Read and execute .llm/plans/active/mobile-p2-home-subscribed-chips/01-kind-and-loaders.md

Follow detail 739 and locked decisions in 00-SUMMARY.md.

Do not run tests during agent work; leave operator verification commands at the end.
```

---

- [x] **02 — Empty CTAs + Browse/Search params**

**Cursor model:** Codex 5.3
**Reasoning:** medium

```
Read and execute .llm/plans/active/mobile-p2-home-subscribed-chips/02-empty-ctas-and-nav.md

Follow detail 740 and locked decisions in 00-SUMMARY.md.

Do not run tests during agent work; leave operator verification commands at the end.
```

---

- [x] **03 — Filter + E2E + docs**

**Cursor model:** Codex 5.3
**Reasoning:** medium

```
Read and execute .llm/plans/active/mobile-p2-home-subscribed-chips/03-filter-e2e-docs.md

Follow detail 741 and locked decisions in 00-SUMMARY.md.

Do not run tests during agent work; leave operator verification commands at the end.
```

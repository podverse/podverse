# COPY-PASTA — Mobile Reusability Pass

Use one prompt at a time, in order.

## Step 1 — Scaffold and state gates

- [x] completed

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-reusability-pass/01-screen-scaffold-and-state-gates.md
Implement reusable mobile screen scaffold + shared loading/error/auth-empty state gate components/hooks.
Preserve current behavior and testIDs. Do not run tests during agent work.
```

## Step 2 — Card and row mappers

- [x] completed

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-reusability-pass/02-shared-card-and-row-mappers.md
Extract reusable SectionCard/list-section primitives and shared DTO-to-row mappers.
Refactor profile/library screens to consume them. Do not run tests during agent work.
```

## Step 3 — Queue/history hooks

- [x] completed

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-reusability-pass/03-queue-history-shared-hooks.md
Extract shared queue selection/loading/mapping hooks and refactor LibraryQueue + LibraryHistory to use them.
Do not run tests during agent work.
```

## Step 4 — Profile composition

- [x] completed

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-reusability-pass/04-profile-section-composition.md
Create reusable profile content sections and shared profile loading hooks.
Refactor Profile + MyProfile into thin composition layers. Do not run tests during agent work.
```

## Step 5 — RSS domain split (final)

- [x] completed

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-reusability-pass/05-rss-domain-hooks-and-service-split.md
Refactor AddByRssRootScreen by extracting reusable RSS hooks/services (sync, add flow, playback).
On this final step, archive this plan set to .llm/plans/completed/ and end with cumulative operator verification commands.
Do not run tests during agent work.
```

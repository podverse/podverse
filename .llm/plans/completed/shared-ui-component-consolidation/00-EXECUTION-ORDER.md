# Shared UI component consolidation — execution order

Run the numbered prompts in [`COPY-PASTA.md`](COPY-PASTA.md) in order:

1. [`01-inventory-and-target-apis.md`](./01-inventory-and-target-apis.md) — Per-family contracts,
   source paths, shared vs wrapper split.
2. [`02-low-risk-extractions.md`](./02-low-risk-extractions.md) — Accordion, Callout, CTA shell,
   PopoverIcon, VirtualizedList, spinner/overlay foundation.
3. [`03-medium-risk-convergence.md`](./03-medium-risk-convergence.md) — Dropdown, MoreButton,
   NavArrowButton, NavBar, Pagination (web-baseline parity).
4. [`04-high-risk-feasibility-and-wrappers.md`](./04-high-risk-feasibility-and-wrappers.md) — App
   shell, Image, Link, Toast, Footer, Modal shell vs domain modals.
5. [`05-management-web-convergence.md`](./05-management-web-convergence.md) — Replace
   management-web patterns with shared primitives; navbar parity notes.
6. [`06-rules-and-skills-hardening.md`](./06-rules-and-skills-hardening.md) — `.cursor` rules and
   skills so `packages/ui` stays the default home for reusable UI.
7. [`07-verification-and-rollout.md`](./07-verification-and-rollout.md) — Tests, E2E make targets,
   completion tracking.

**Archive:** This directory is the canonical location for the completed plan set (`COPY-PASTA.md`,
`00-*`, and numbered phases `01`–`07`).

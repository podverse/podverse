# Execution order — mobile-membership-and-v4v

Execute one COPY-PASTA prompt at a time. **Agents implement only — do not run tests.** The operator
runs verification after each step.

| # | Phase | File | Model | Depends on |
| --- | --- | --- | --- | --- |
| 1 | Shared membership-403 parser + contract docs (no API behavior change) | [`01-api-membership-response-contract.md`](./01-api-membership-response-contract.md) | Opus 4.8 | — |
| 2 | Mobile membership state (`useMembership`) | [`02-mobile-membership-state.md`](./02-mobile-membership-state.md) | Codex 5.3 | 1 |
| 3 | Mobile premium blocked-action modal + gate wiring | [`03-mobile-premium-gate-modal.md`](./03-mobile-premium-gate-modal.md) | Codex 5.3 | 1, 2 |
| 4 | Membership screen (web parity) | [`04-mobile-membership-screen.md`](./04-mobile-membership-screen.md) | Opus 4.8 | 2 |
| 5 | Checkout entry (web-link) | [`05-mobile-checkout-entry.md`](./05-mobile-checkout-entry.md) | Codex 5.3 | 4 |
| 6 | V4V placeholder screen | [`06-mobile-v4v-placeholder.md`](./06-mobile-v4v-placeholder.md) | Auto | — (independent; do anytime) |
| 7 | E2E: mobile gate + renew nav + V4V | [`07-e2e-membership-and-v4v.md`](./07-e2e-membership-and-v4v.md) | Codex 5.3 | 2–6 |
| 8 | **Web** membership-gating parity (broaden modal + web E2E) | [`08-web-membership-gating-parity.md`](./08-web-membership-gating-parity.md) | Opus 4.8 | 1 |

## Notes

- **1 is the shared foundation** (parser in `@podverse/helpers-requests`); 2/3 (mobile) and 8 (web)
  all build on it. After 1, mobile (2→3→4→5→7) and web (8) can proceed in parallel.
- **6 (V4V)** is tiny and independent — safe to do first to get a quick win, or last.
- **8 is web-app only** (management-web excluded — admin-only UX) and changes web behavior, so it
  ships with an E2E screenshot spec.
- Every step keeps existing `testID`s, preserves virtualization, and localizes new copy via the i18n
  catalog (mobile namespace) — no literals in primitives.
- This set is **feature work**; it does not change the master-plan **publish hold**.

Use [`COPY-PASTA.md`](./COPY-PASTA.md) for one-block-at-a-time execution.

# 11 — Web subscribed filter input

**Cursor model:** Codex 5.3
**Reasoning:** high
**Detail:** [713-web-subscribed-filter-input](/docs/proposals/mobile/_master-plan_/phase-2/details/713-web-subscribed-filter-input.md)
**Master step:** P2.5.2
**Depends on:** 05

Read [00-SUMMARY.md](00-SUMMARY.md) decisions 41–42 before starting. This is a **web** prompt inside
a mobile-focused set — verify with Playwright, not Maestro.

## Goal

`/podcasts` gets the same `Filter…` input mobile's Home gained in prompt 05, so the two surfaces
behave alike.

## Behavior

- Shown for the **subscribed** list type only.
- Matches on **channel title only** — not description, author, or category.
- Matches raw **and** article-stripped title, case-insensitive substring.
- It is a **filter, not a search**. It never calls the search API.

## The web-specific complication — resolve it explicitly

Web paginates server-side. A naive client-side filter would narrow only the **current page**, which
reads as broken when a user filters and gets nothing on page 3. Mobile has no such problem because
its whole subscribed list is local.

Pick one and say why in the implementation:

1. Fetch the full subscribed channel list when the subscribed type is active and filter client-side,
   if list sizes make that reasonable.
2. Otherwise pass the filter term to the subscribed endpoints as a server-side title filter and keep
   pagination authoritative.

Either way, **filtering applies across the whole subscribed list, never a single page**, and
pagination reflects filtered results. A page-local filter fails review.

## Work

1. Add the input to the `/podcasts` header alongside the existing type, sort, range, and view
   controls, shown only for the subscribed type.
2. Implement the chosen full-list approach above.
3. Put the filter term in **URL query state** like the other controls, so a filtered list is linkable
   and survives reload. Follow **routing-url-params** and **e2e-url-state-contracts**.
4. Distinct empty states: "no matches for this filter" is not the same as "no subscriptions".
5. **i18n:** placeholder and empty-state strings come from the **`consumer`** catalog, shared with
   mobile. Reuse the keys prompt 05 created rather than adding web-only duplicates.
6. Extend the `/podcasts` E2E spec: filtering narrows results, the no-match empty state renders, and
   the term round-trips through the URL.

## Constraints

- Do not add filtering to global or category browse; those are server-paginated directory queries
  where search is the right tool.
- Do not change the existing sort, range, or view controls.
- Design tokens only; prefer `@podverse/ui` primitives.
- **Screen reader** per [`screen-reader-accessibility`](/.cursor/rules/screen-reader-accessibility.mdc):
  the input needs a real associated label (not placeholder-only, which disappears once typing
  starts), and filtered result counts must be announced through an `aria-live` region — otherwise the
  list silently changes under a screen reader user. Keep it keyboard operable with a visible focus
  ring.
- Strict equality, no type assertions, `import type` on separate lines.
- Do not run tests during implementation.

## Done when

`/podcasts` filters the whole subscribed list by title for the subscribed type only, pagination
reflects filtered results, the term round-trips through the URL, empty states are distinct, and no
search API call results from typing.

# 755-mobile-faq-and-clip-how-to

**Master step:** P2.1.12
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

The two mobile surfaces that read the managed-copy endpoint from
[754](754-server-managed-copy-endpoint.md), plus the shared markdown rendering they need. First slice
of P2.1.12; the rest of the legacy static and support screens (About, Contact, Privacy policy, Terms
of service, Contribute) stay untouched.

### FAQ screen

`MoreFaqScreen` on the More stack, reached from a row in the More hub. Fetches `faq`, renders the
markdown, and shows a spinner while the request is out. No local copy of the text and no bundled
fallback: a stale answer read from the app binary is worse than a spinner, because the reason this
document is served at all is that its answer can change.

### How To modal

On Make Clip, the `clip-how-to` document opens as a modal. It shows itself **once**, the first time a
user ever opens Make Clip, remembered in a `prefsStore` key; afterwards it is behind the footer How To
button. The previous generation did exactly this, and the reason holds: tap-to-capture times are not
guessable from looking at the screen, so the first visit needs one explanation, and every visit after
that does not.

The footer also carries FAQ, which opens the FAQ content the same way. Both are links out of a form
the user is in the middle of filling in, so neither may discard a draft in progress.

### Loading states

Both surfaces show `LoadingSection` until the request settles, then content or an error with retry —
[`mobile-pending-content-spinner`](/.cursor/rules/mobile-pending-content-spinner.mdc). Served copy
arrives over the network every time, so there is always a moment with nothing to paint, and a blank
panel reads as "there is nothing here" rather than "this is coming".

**The existing popularity-tracking body has this bug and is fixed in the same change.**
`PopularityTrackingAgreementBody` renders an empty markdown area with live Yes / No buttons while the
agreement is still loading, which asks someone to consent to text they cannot see yet. It is the same
fetch-and-render shape as these two screens, so it gets the same spinner rather than staying the one
counter-example in the codebase.

### Shared markdown rendering

`parsePopularityTrackingMarkdown` and its abridging helper in `@podverse/helpers` are named after
their first caller but do not know anything about popularity tracking — they parse headings, lists,
and paragraphs. They are renamed to generic copy-markdown names, and mobile's
`PopularityTrackingMarkdown` becomes a shared `CopyMarkdown` component under
`apps/mobile/src/components/`, with the popularity-tracking call sites updated in the same change.

Renaming rather than adding a second parser: three documents rendering markdown through two
near-identical components is how a codebase ends up with two markdown dialects, one of which quietly
does not support lists ([`reuse-beyond-components`](/.cursor/rules/reuse-beyond-components.mdc)).

### The policy becomes abcmemory

A new rule records when copy is served and when it is a catalog key, so the next author does not have
to infer it from the existence of two endpoints:

- Served as API markdown when the text describes how the service behaves and can change without an
  app release — FAQ, how-tos, terms of service, consent agreements.
- A catalog key for everything else, which is nearly all UI copy: labels, buttons, empty states,
  errors.
- Served copy always has a visible loading state, and never a bundled fallback copy of itself.

## Acceptance criteria

- A More row opens the FAQ screen, which renders the served `faq` markdown.
- Make Clip shows the `clip-how-to` modal automatically on a user's first visit and never again.
- The footer How To and FAQ controls open that content on any visit, and dismissing either returns to
  the form with the draft intact.
- Both surfaces show a spinner while loading and a retryable error on failure.
- The popularity-tracking agreement body shows a spinner instead of an empty panel with live consent
  buttons.
- One markdown parser and one mobile markdown component serve all three documents.
- Headings, lists, paragraphs, and inline emphasis render; screen readers announce headings as
  headings.
- The new rule exists under `.cursor/rules/` and states the served-versus-catalog test.

## Web parity references

- `apps/web/src/app/popularity-tracking/PopularityTrackingGateClient.tsx` — same fetch shape, same
  missing spinner
- Web's FAQ counterpart: [756](756-web-faq-and-clip-preview-parity.md)

## Verification

```bash
npm run mobile:e2e:test -- make-clip
```

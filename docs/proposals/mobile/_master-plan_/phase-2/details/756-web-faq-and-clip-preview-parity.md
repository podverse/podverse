# 756-web-faq-and-clip-preview-parity

**Master step:** P2.5.4
**Model (author + implement):** Codex 5.3
**Status:** planned

## Scope

The web counterparts of the clip authoring work: a `/faq` page reading the managed-copy endpoint, and
web's adoption of the shared clip-preview constant.

Web is a client of this content, not a bystander. The FAQ answers a question about how clips behave —
the same question, with the same answer, whichever surface someone asks it on — and the endpoint from
[754](754-server-managed-copy-endpoint.md) exists precisely so one document serves both. A web page
with its own copy of that text would drift from the phone's copy the first time the answer changed.

### `/faq`

A new route under `apps/web/src/app/faq/` that fetches `faq` and renders the markdown, with SEO
metadata like the other informational pages. It follows `/terms` and `/about` for layout and
`popularity-tracking` for the fetch-and-render shape — the difference being that the copy comes from
the API rather than the catalog.

There is no web equivalent of the Make Clip how-to modal. Web's clip form types timestamps into
HH:MM:SS fields, which needs no explanation; the how-to explains tap-to-capture, which only exists on
mobile.

### Loading state

The page shows `WebLoadingSpinnerOverlay` while the request is out, for the reason in
[755](755-mobile-faq-and-clip-how-to.md): served copy always has a moment with nothing to paint. The
popularity-tracking gate and settings panel get the same treatment in the same change, since they
share the fetch shape and today render an empty area while loading.

### Shared preview lead

`ClipForm` hardcodes the three-second lead for its end-time preview. It reads
`CLIP_END_PREVIEW_LEAD_SECONDS` from `@podverse/helpers` instead, so the two surfaces cannot drift on
how much run-up a preview plays. This is the same move the player jump intervals made in
[748](748-player-transport-parity.md): one constant, both surfaces.

### Not in scope

Web's clip editor still does not hold the queue. It sets `autoQueueConfig.disabled: true` and nothing
reads it, so an episode that ends while the editor is open can still advance. The hold shipped for
mobile in [753](753-clip-authoring-playback-hold.md) is a shared playback-core decision, but web's
advance runs through `useQueueResourcesLoadActive` rather than that resolver, so adopting it is a
media-player change rather than a line in this step. Recorded here so it is a known gap rather than an
assumed parity.

## Acceptance criteria

- `/faq` renders the served `faq` markdown, with a spinner while loading and page metadata.
- The page reads the same endpoint and slug as mobile; no web copy of the FAQ text exists.
- `ClipForm`'s end-time preview reads the shared constant and still seeks three seconds early.
- The popularity-tracking gate and settings panel show a loading state instead of an empty panel.
- Existing clip form and popularity-tracking E2E coverage still passes, extended for the new page.

## Web parity references

- `apps/web/src/app/terms/page.tsx`, `apps/web/src/app/about/page.tsx` — informational page shape
- `apps/web/src/app/popularity-tracking/PopularityTrackingGateClient.tsx` — fetch and render
- `apps/web/src/components/Clip/ClipForm.tsx` — preview buttons

## Verification

```bash
make e2e_test_web_report_spec SPEC=e2e/faq.spec.ts,e2e/clip-editor-modal.spec.ts
```

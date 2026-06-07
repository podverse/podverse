# 04 — Share to embed builder modal and preview

## Objective

Add embed creation UX to existing share flow: a user can open Share, click Create Embed, and configure or
copy embed output from a dedicated builder modal.

## Prerequisites

- Phases 1–3 complete (routes, embed URL contract, inline preview targets).
- Read canonical URL mapping table in [`00-SUMMARY.md`](./00-SUMMARY.md).

## Scope

- In Share modal, add `Create Embed` action below copy-link inputs (replace current embed TODO row).
- On click:
  - close Share modal cleanly,
  - open Embed Builder modal with the same entity context.
- Builder modal features:
  - live preview of current embed configuration (iframe or inline embed surface),
  - controls for minimal phase-1 URL params (`autoplay`, `t`; list routes also expose `play_id_text`
    in an advanced/hidden section),
  - generated embed code output (`<iframe …>`),
  - advanced section placeholder for future color customization.

## File targets

- `/apps/web/src/lib/embed/buildEmbedUrl.ts` (required — single source of truth for embed URLs)
- `/apps/web/src/lib/embed/buildEmbedIframeCode.ts` (optional helper wrapping URL → iframe snippet)
- `/apps/web/src/components/Modal/ModalShare.tsx`
- `/apps/web/src/components/Modal/ModalEmbedBuilder.tsx` (new)
- `/apps/web/src/components/Modals/Modals.tsx`
- `/apps/web/src/contexts/Modals.tsx`
- i18n keys in `/apps/web/i18n/originals/en-US.json` as needed

## Canonical URL builder contract

`buildEmbedUrl.ts` is the **only** place that maps entity context → typed embed path + query string.
All builder preview, copy output, and share handoff must call it.

Mapping acceptance checks (must pass):

| Share context | Generated embed path |
| --- | --- |
| Podcast channel (+ optional episode) | `/embed/episode/{id}` when item present; `/embed/podcast/{id}` for list |
| Album channel (+ optional track) | `/embed/track/{id}` when item present; `/embed/album/{id}` for list |
| Clip | `/embed/clip/{id}` |
| Chapter | `/embed/chapter/{id}` |
| Official clip (soundbite) | `/embed/official-clip/{id}` (**not** `/soundbite/…`) |
| Playlist | `/embed/playlist/{id}` |

Fix the existing wrong soundbite share URL in `ModalShare.tsx` (`/soundbite/…` → `/official-clip/…` for
page share links; embed URLs always use `/embed/official-clip/…`).

## Modal handoff contract

- Add explicit `modalEmbedBuilder` state in `Modals.tsx` (mirror `modalShare` shape for entity context).
- Handoff sequence:
  1. User clicks Create Embed in Share modal,
  2. Share state resets to defaults (modal closes),
  3. Builder state populated with same entity context (modal opens).
- Closing builder resets builder state; no orphan Share modal state remains.
- Only one of Share or Builder is open at a time.

## Test-target contract

| Element | `data-testid` |
| --- | --- |
| Create Embed button | `share-create-embed` |
| Builder modal root | `embed-builder-modal` |
| Preview iframe/surface | `embed-builder-preview` |
| Generated code field | `embed-builder-code` |
| Autoplay toggle | `embed-builder-autoplay` |
| Start time input | `embed-builder-start-time` |

## Implementation notes

- Follow existing modal handoff patterns used by other modal flows.
- Keep modal state shape explicit (avoid implicit nullable coupling).
- Builder preview URL must be produced by `buildEmbedUrl.ts` — preview updates when controls change.
- Include a clear placeholder block for future UI color customization without implementing color system yet.
- Builder preview loads the minimal embed layout route (chromeless).

## Acceptance criteria

- Share modal shows `Create Embed` action (`share-create-embed`) below copy-link inputs.
- Clicking Create Embed closes Share and opens Builder with preserved entity context.
- Builder preview (`embed-builder-preview`) reflects chosen route/entity + query options.
- Embed code output (`embed-builder-code`) updates as user changes options.
- Generated URLs use `/embed/official-clip/…` for soundbites (regression guard).
- Advanced customization section is present and explicitly labeled as placeholder.
- Closing builder leaves no orphan modal state; Share copy-link rows still work (regression).

## E2E note

Add `apps/web/e2e/embed-share-builder.spec.ts` in this phase or Phase 5 (see Phase 5 spec split). At
minimum, cover Share → Create Embed → Builder open + URL correctness for episode and official-clip cases.

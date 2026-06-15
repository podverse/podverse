# 01 — Layout tokens and responsive single video

## Objective

Introduce aspect-ratio layout tokens, parse `ar` query param end-to-end, replace the single-video
fixed placeholder shell with a width-filling aspect-ratio box, and update iframe codegen to emit a
responsive wrapper for single video embeds.

## Prerequisites

- Read [`00-SUMMARY.md`](./00-SUMMARY.md) locked decisions and query contracts.

## Scope

- Add aspect-ratio tokens and CSS custom properties.
- Parse and propagate `ar` (`16x9` default | `4x3` | `1x1`).
- Single video embed: shell uses `aspect-ratio` (not fixed 452px placeholder stack).
- `buildEmbedIframeCode`: responsive wrapper for single + video presentation.
- Builder: aspect ratio selector for `video` and `video-list` types.
- **Do not** implement video playback or overlays in this phase (Phase 2–3).

## File targets

### New

- `apps/web/src/lib/embed/embedAspectRatio.ts` — enum, defaults, ratio → CSS value + padding-bottom %
- `apps/web/src/lib/embed/parseEmbedAspectRatio.ts` — normalize invalid → `16x9`
- `apps/web/src/lib/embed/__tests__/parseEmbedAspectRatio.test.ts`

### Modified

- `apps/web/src/styles/components/embed/_embedLayoutTokens.scss`
- `apps/web/src/styles/components/embed/_embedLayout.scss`
- `apps/web/src/lib/embed/embedLayoutTokens.ts`
- `apps/web/src/lib/embed/embedLayoutDimensions.ts`
- `apps/web/src/lib/embed/embedTypes.ts` — add `aspectRatio` to shared query type
- `apps/web/src/lib/embed/parseEmbedQueryParams.ts`
- `apps/web/src/lib/embed/buildEmbedRuntime.ts` (if needed to pass through)
- `apps/web/src/lib/embed/buildEmbedUrl.ts`
- `apps/web/src/lib/embed/buildEmbedIframeCode.ts`
- `apps/web/src/lib/embed/embedBuilderTypes.ts`
- `apps/web/src/lib/embed/parseEmbedBuilderQueryParams.ts`
- `apps/web/src/lib/embed/buildEmbedBuilderUrl.ts`
- `apps/web/src/components/embed/EmbedSingleShell.tsx`
- `apps/web/src/styles/components/embed/EmbedSingleShell.module.scss`
- `apps/web/src/components/embed/EmbedPlayerPanel.module.scss`
- `apps/web/src/components/embed/EmbedBuilderPanel.tsx`
- `apps/web/i18n/originals/en-US.json` — builder labels for aspect ratio options

## Token design

Add to `_embedLayoutTokens.scss` (mirror in `embedLayoutTokens.ts`):

```scss
$embed-video-aspect-ratio-16x9: calc(16 / 9);
$embed-video-aspect-ratio-4x3: calc(4 / 3);
$embed-video-aspect-ratio-1x1: 1;
$embed-video-overlay-fade-duration-ms: 3000;
$embed-video-overlay-transition-ms: 300;
```

Extend `@mixin embed-player-panel-custom-properties`:

```scss
--embed-video-aspect-ratio: #{$embed-video-aspect-ratio-16x9};
```

Set `--embed-video-aspect-ratio` on the embed root or video shell from parsed `ar` param via inline
style or data-attribute + SCSS attribute selectors (prefer CSS var on shell element from React).

### Aspect ratio mapping

| Query `ar` | CSS `aspect-ratio` | Iframe padding-bottom |
| ---------- | ------------------ | --------------------- |
| `16x9`     | `16 / 9`           | `56.25%`              |
| `4x3`      | `4 / 3`            | `75%`                 |
| `1x1`      | `1 / 1`            | `100%`                |

Export helpers in `embedAspectRatio.ts`:

```typescript
export const EMBED_ASPECT_RATIO_VALUES = ['16x9', '4x3', '1x1'] as const;
export type EmbedAspectRatioQuery = (typeof EMBED_ASPECT_RATIO_VALUES)[number];

export function embedAspectRatioToCssValue(ar: EmbedAspectRatioQuery): string { ... }
export function embedAspectRatioToPaddingBottomPercent(ar: EmbedAspectRatioQuery): number { ... }
```

## Query param: `ar`

Add to `sharedQuerySchema` in `parseEmbedQueryParams.ts`:

```typescript
ar: z.enum(['16x9', '4x3', '1x1']).optional().default('16x9'),
```

Map to `EmbedSharedQueryParams.aspectRatio`. Include in `buildEmbedUrl` query string when not default
(omit `16x9` from generated URLs for brevity, or always emit — pick one and document in
`EMBED-PLAYER.md`; prefer omit default).

## Single video shell layout

Replace current single-video layout (info row stacked above 334px placeholder) with:

```text
┌─────────────────────────────────────┐
│  aspect-ratio box (width: 100%)     │
│  ┌───────────────────────────────┐  │
│  │  video stage (black bg)       │  │
│  │  (placeholder until Phase 2)  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

`EmbedSingleShell.module.scss`:

- Audio: keep `$embed-single-audio-shell-height` fixed (166px).
- Video: `width: 100%`; `aspect-ratio: var(--embed-video-aspect-ratio)`; no fixed height.
- Remove dependence on `$embed-single-video-shell-height` for the single shell (deprecate constant or
  keep for demo preview fallback only).

`EmbedPlayerPanel` video branch: prepare container with `aspect-ratio` filling shell; keep
`EmbedVideoPlaceholder` temporarily inside the box until Phase 2 replaces it.

## Responsive iframe codegen

Update `buildEmbedIframeCode.ts`:

```typescript
export function buildEmbedIframeCode(embedUrl, options?: {
  layout?: 'single' | 'list';
  presentation?: 'audio' | 'video';
  aspectRatio?: EmbedAspectRatioQuery;
  height?: number | string; // fixed height for audio / list
}): string
```

When `layout === 'single' && presentation === 'video'`:

```html
<div style="position:relative;width:100%;padding-bottom:56.25%;height:0;overflow:hidden;">
  <iframe src="..." style="position:absolute;inset:0;width:100%;height:100%;border:0;" ...></iframe>
</div>
```

Audio single and all list modes: keep numeric `height` attribute (deterministic).

Update `EmbedBuilderPanel` preview iframe to use the same wrapper for video single types.

## Builder UI

In `EmbedBuilderPanel`, when `effectiveParams.type` is `video` or `video-list`, show aspect ratio
radio group:

- 16:9 (default)
- 4:3
- 1:1

Wire to builder query param `ar` via `parseEmbedBuilderQueryParams` / `buildEmbedBuilderUrl`.

## Deprecations / cleanup

- `$embed-single-video-placeholder-height` (334px): no longer drives single shell height; may remain
  temporarily for list fixed video box until Phase 4 retokens it.
- Update `EmbedDemoPreviewIframe` height classes for single-video demo to use aspect-ratio wrapper
  or min-height for preview frame.

## Unit tests

`parseEmbedAspectRatio.test.ts`:

- missing → `16x9`
- invalid → `16x9`
- each valid value preserved
- padding-bottom percent helpers

## Acceptance criteria

- `ar` parsed on all embed routes; invalid values normalize to `16x9`.
- Single video shell fills iframe width and maintains selected aspect ratio.
- Generated iframe code for single video uses responsive wrapper with correct padding-bottom.
- Builder exposes aspect ratio control for video types; preview reflects selection.
- Audio single embed unchanged (fixed 166px).
- SCSS tokens and `embedLayoutTokens.ts` stay in sync.
- Unit tests written for aspect ratio parsing/helpers.

## Out of scope

- Video playback mount (Phase 2).
- Overlays (Phase 3).
- List `rows` param (Phase 4).
- Auto-resize (Phase 5).

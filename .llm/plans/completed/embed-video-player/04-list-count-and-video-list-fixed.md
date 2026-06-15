# 04 — List row count and fixed video+list layout

## Objective

Add configurable list visible row count (`rows` query param, 2–10, default 5), wire builder control,
and implement the **default fixed-height** video+list shell where video region height is deterministic
and list region height = `rows × row-height`.

## Prerequisites

- Phases 1–3 complete (video stage + overlays work in list context via `EmbedListShell`).

## Scope

- Parse and propagate `rows` param.
- Replace hardcoded `$embed-list-region-video-height` (542px) with formula based on row count.
- Fixed video player box height for list layout (deterministic iframe height).
- Builder UI for row count on list embed types.
- Update iframe height codegen for list + video + rows combination.
- Account for optional presentation selector height when mixed media.

## File targets

### New

- `apps/web/src/lib/embed/parseEmbedListRows.ts`
- `apps/web/src/lib/embed/__tests__/parseEmbedListRows.test.ts`
- `apps/web/src/lib/embed/__tests__/embedLayoutDimensionsVideo.test.ts`

### Modified

- `apps/web/src/styles/components/embed/_embedLayoutTokens.scss`
- `apps/web/src/styles/components/embed/_embedLayout.scss`
- `apps/web/src/lib/embed/embedLayoutTokens.ts`
- `apps/web/src/lib/embed/embedLayoutDimensions.ts`
- `apps/web/src/lib/embed/embedTypes.ts` — `listVisibleRows` on list query types
- `apps/web/src/lib/embed/parseEmbedQueryParams.ts` — `rows` on list schemas
- `apps/web/src/lib/embed/buildEmbedUrl.ts`
- `apps/web/src/lib/embed/buildEmbedIframeCode.ts`
- `apps/web/src/lib/embed/embedBuilderTypes.ts`
- `apps/web/src/lib/embed/parseEmbedBuilderQueryParams.ts`
- `apps/web/src/lib/embed/buildEmbedBuilderUrl.ts`
- `apps/web/src/components/embed/EmbedListShell.tsx`
- `apps/web/src/components/embed/EmbedListShell.module.scss`
- `apps/web/src/components/embed/EmbedPlayerPanel.module.scss`
- `apps/web/src/components/embed/EmbedBuilderPanel.tsx`
- `apps/web/i18n/originals/en-US.json`

## Query param: `rows`

Add to podcast/album/playlist list schemas:

```typescript
rows: z
  .preprocess((value) => {
    const parsed = parsePlaybackSeconds(value);
    if (parsed === undefined) return 5;
    const rows = Math.floor(parsed);
    if (rows < 2) return 2;
    if (rows > 10) return 10;
    return rows;
  }, z.number())
  .optional()
  .default(5),
```

Map to `listVisibleRows` on list query param types. Omit from generated URL when default `5`.

## Layout formulas

Existing constants:

```scss
$embed-list-row-height: 48px;
$embed-presentation-selector-height: 52px;
```

New computed values:

```scss
// List region height = visible rows × row height
$embed-list-region-height-for-rows: calc(
  var(--embed-list-visible-rows) * #{$embed-list-row-height}
);
```

Set on list shell:

```tsx
style={{ '--embed-list-visible-rows': String(listVisibleRows) } as React.CSSProperties}
```

### Fixed video box for list layout (per aspect ratio)

Replace `$embed-list-video-placeholder-height` (234px) with a fixed pixel height **derived from the
chosen aspect ratio at a reference width** (default reference width 640px). The list video box is
fixed regardless of actual iframe width (letterbox/pillarbox inside the stage); only the `ar` choice
changes it.

| `ar` | Reference width | List video box height |
| ---- | --------------- | --------------------- |
| `16x9` | 640px | 360px |
| `4x3` | 640px | 480px |
| `1x1` | 640px | 640px |

Compute box height = `referenceWidth / aspectRatioValue`. Both SCSS and `embedLayoutDimensions.ts`
must compute this from the same `ar` input so the iframe height attribute and the rendered box agree.
Do not hardcode a single 360px token; key the box height off `ar`.

Update `_embedLayout.scss`:

```scss
$embed-list-video-shell-height: calc(
  #{$embed-list-video-player-fixed-height}
  + #{$embed-list-region-height-for-rows}
  + optional presentation selector
);
```

### Audio list (unchanged formula shape)

Replace fixed `$embed-list-region-audio-height: 588px` with rows-based calc defaulting to 5 rows:

```scss
// 5 × 48 = 240 — NOTE: current default is 588 (~12 rows visible)
```

**Decision (locked):** Default 5 rows applies to **all** list embeds — audio AND video. Current audio
list uses 588px (~12 rows); the new default is 5 rows / 240px. Existing copied iframes keep their
hardcoded `height` attribute, so live embeds do not change size; only the in-iframe scroll viewport
and newly generated defaults change. Document the change in `EMBED-PLAYER.md`.

- Remove the fixed `$embed-list-region-audio-height: 588px`; derive audio list region from rows too.
- `rows` param is available on audio list embeds as well (2–10), defaulting to 5.

Whole list audio shell:

```scss
$embed-list-audio-shell-height: calc(
  #{$embed-player-panel-audio-height} + var(--embed-list-visible-rows) * #{$embed-list-row-height}
);
```

Add presentation selector to shell when mixed media:

```scss
+ var(--embed-has-presentation-selector, 0) * #{$embed-presentation-selector-height}
```

Set `--embed-has-presentation-selector: 1` via class on shell when selector visible.

## List shell CSS

`EmbedListShell.module.scss`:

```scss
.listRegion {
  flex: 0 0 auto;
  height: calc(var(--embed-list-visible-rows) * #{$embed-list-row-height});
  overflow-y: auto;
}
```

Remove `flex: 1` stretch behavior; explicit height from row count.

Video shell class sets fixed video panel height + list region height.

## Iframe height codegen

`embedLayoutDimensions.ts`:

```typescript
export function getEmbedListIframeHeightPx(options: {
  presentation: 'audio' | 'video';
  listVisibleRows: number;
  aspectRatio?: EmbedAspectRatioQuery; // for video player box height if ratio-based
  includePresentationSelector?: boolean;
}): number
```

`buildEmbedIframeCode` / builder preview pass `rows` and presentation for height calculation.

## Builder UI

For `audio-list` and `video-list` types:

- Number input or select: "List items visible" — 2–10, default 5.
- Maps to builder param `rows`.
- Regenerate iframe code height when changed.

For `video-list`, also show aspect ratio (Phase 1) and note fixed video box height in helper text.

## EmbedListShell integration

Pass `listVisibleRows` from parsed list query to shell style and iframe dimension helpers.

Ensure video `EmbedVideoStage` fills fixed-height video panel in list layout (not aspect-ratio shell —
list uses fixed video box; single uses aspect-ratio).

`EmbedPlayerPanel` prop distinction:

```typescript
panelLayout: 'single' | 'list';
// single + video → aspect-ratio shell
// list + video → fixed height player region
```

## Unit tests

- `parseEmbedListRows.test.ts`: clamp 1→2, 99→10, default 5.
- `embedLayoutDimensionsVideo.test.ts`: height math for audio/video list at rows 2, 5, 10.

## Acceptance criteria

- `rows` query param parsed and clamped 2–10; default 5.
- List region shows exactly N row heights of scroll viewport (content may scroll beyond).
- Builder exposes row count for list types; iframe height updates accordingly.
- Video+list default mode: deterministic total iframe height (fixed video box + rows × 48px).
- Video stage + overlays render correctly in list fixed-height panel.
- Audio list embed respects same row count (breaking height change documented).
- SCSS/TS token sync maintained.

## Out of scope

- postMessage auto-resize (Phase 5).
- E2E specs (Phase 6).

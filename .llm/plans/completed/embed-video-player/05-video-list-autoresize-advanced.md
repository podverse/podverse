# 05 — Video+list auto-resize (advanced, opt-in)

## Objective

Implement secure, opt-in postMessage-based iframe auto-resize for video+list embeds so the video
region can be width-responsive while the list keeps a fixed row-based height. Default remains fixed
deterministic heights (Phase 4); auto-resize only when `resize=1` and parent runs listener snippet.

## Prerequisites

- Phase 4 complete (list shell with row-based heights and fixed video+list mode).

## Scope

- Parse `resize` query param (default false).
- Embed-side height measurement + postMessage when enabled.
- Parent listener snippet generation in builder (advanced section).
- Security: origin validation, namespaced messages, no broadcast when disabled.

## File targets

### New

- `apps/web/src/lib/embed/parseEmbedAutoResize.ts`
- `apps/web/src/lib/embed/embedResizeMessage.ts` — message type constants + validators
- `apps/web/src/lib/embed/buildEmbedResizeListenerSnippet.ts`
- `apps/web/src/hooks/useEmbedVideoAutoResize.ts`

### Modified

- `apps/web/src/lib/embed/parseEmbedQueryParams.ts` — `resize` on list schemas (video presentation only enforced at runtime)
- `apps/web/src/lib/embed/embedTypes.ts`
- `apps/web/src/lib/embed/buildEmbedUrl.ts`
- `apps/web/src/components/embed/EmbedListShell.tsx` — mount auto-resize hook when enabled
- `apps/web/src/components/embed/EmbedBuilderPanel.tsx` — advanced toggle + listener snippet textarea
- `apps/web/src/lib/embed/embedBuilderTypes.ts`
- `apps/web/src/lib/embed/parseEmbedBuilderQueryParams.ts`
- `apps/web/src/lib/embed/buildEmbedBuilderUrl.ts`
- `apps/web/i18n/originals/en-US.json`

## Query param: `resize`

List routes only:

```typescript
resize: z.preprocess(parseEmbedAutoplay, z.boolean()).optional().default(false),
```

Reuse boolean parser (`true`/`1`/`yes`). Map to `autoResize: boolean` on list query types.

Runtime gate in `EmbedListShell`:

```typescript
const autoResizeEnabled =
  presentationStyle === 'video' && listQuery.autoResize === true;
```

**Never** enable for audio presentation or single embeds.

Include `resize=1` in embed URL only when builder advanced toggle is on.

## Embed-side behavior

`useEmbedVideoAutoResize({ enabled })`:

1. If `!enabled`, return immediately (no listeners, no postMessage).
2. Observe `document.documentElement` or embed root `scrollHeight` via `ResizeObserver` + window
   `resize` (debounced).
3. Compute height:

```typescript
const height = Math.ceil(document.documentElement.getBoundingClientRect().height);
```

4. postMessage to parent:

```typescript
window.parent.postMessage(
  {
    source: 'podverse-embed',
    type: 'resize',
    height,
  },
  parentOrigin // see security below
);
```

### Video region in auto-resize mode

When `autoResizeEnabled`:

- Video panel uses **width-responsive aspect ratio** inside list shell (same as single: `width: 100%`;
  `aspect-ratio: var(--embed-video-aspect-ratio)`).
- List region keeps fixed `rows × row-height`.
- Total document height varies with iframe width → parent must resize iframe.

When `!autoResizeEnabled`:

- Phase 4 fixed heights apply.

Toggle CSS class on list shell: `shellVideoAutoResize` vs `shellVideoFixed`.

## Security requirements

### Embed (child)

- postMessage **only** when `resize=1` in URL.
- Target origin: derive from `document.referrer` parent origin when available; fallback to `'*'`
  only if referrer unavailable (document limitation — prefer requiring operator to set
  `data-podverse-allowed-origin` on iframe). **Prefer strict:** if parent origin unknown, still
  post with `targetOrigin '*'` but listener must validate — document tradeoff in EMBED-PLAYER.md.
- Message shape is fixed; include `source: 'podverse-embed'` constant.

### Parent listener snippet

`buildEmbedResizeListenerSnippet({ embedOrigin })` returns copy-paste JS:

```javascript
(function () {
  var EMBED_ORIGIN = 'https://your-podverse-web-origin';
  var MESSAGE_SOURCE = 'podverse-embed';
  var MESSAGE_TYPE = 'resize';

  window.addEventListener('message', function (event) {
    if (event.origin !== EMBED_ORIGIN) return;
    var data = event.data;
    if (!data || data.source !== MESSAGE_SOURCE || data.type !== MESSAGE_TYPE) return;
    if (typeof data.height !== 'number' || data.height < 1) return;

    var iframe = document.querySelector('iframe[data-podverse-embed-resize]');
    if (!iframe) return;

    iframe.style.height = data.height + 'px';
  });
})();
```

Builder instructions:

1. Add `data-podverse-embed-resize` attribute to iframe tag when auto-resize enabled.
2. Paste listener once on host page.
3. Set `EMBED_ORIGIN` to the Podverse web app origin (from runtime config / builder copy).
4. Append `resize=1` to embed URL.

### Builder advanced section

Under "Advanced" in `EmbedBuilderPanel` (video-list only):

- Checkbox: "Auto-resize iframe to content width" → sets `resize=1`.
- When checked, show:
  - Updated iframe code with `data-podverse-embed-resize` attribute.
  - Second textarea: listener snippet (read-only, copy button).
  - Warning copy: requires host page script; off by default for security.

Default iframe code (unchecked): fixed height from Phase 4 — **no** listener snippet.

## embedResizeMessage.ts

```typescript
export const EMBED_RESIZE_MESSAGE_SOURCE = 'podverse-embed';
export const EMBED_RESIZE_MESSAGE_TYPE = 'resize';

export type EmbedResizeMessage = {
  source: typeof EMBED_RESIZE_MESSAGE_SOURCE;
  type: typeof EMBED_RESIZE_MESSAGE_TYPE;
  height: number;
};

export function isEmbedResizeMessage(data: unknown): data is EmbedResizeMessage { ... }
```

Use type guard in snippet template and unit tests.

## Initial height for auto-resize mode

Iframe `height` attribute should be a reasonable initial value (Phase 4 formula at default width
assumption, e.g. 640px) to avoid layout jump; listener adjusts after first message.

## Debouncing

Debounce resize posts to max 10/sec to avoid parent thrashing.

## Acceptance criteria

- Default video+list embed: no postMessage, no resize listeners (Phase 4 behavior).
- With `resize=1`: embed posts namespaced height messages when content height changes.
- Without `resize=1`: zero postMessage calls (verify in implementation / test).
- Builder advanced toggle generates URL param, iframe attribute, and listener snippet.
- Listener snippet documents origin check; ignores malformed messages.
- Auto-resize only active for video presentation list embeds.
- Video region responsive to width; list region fixed to row count.

## Out of scope

- E2E for auto-resize on third-party pages (unit test message shape only; manual doc for integrators).
- cross-origin embed origin config UI beyond static EMBED_ORIGIN in snippet.

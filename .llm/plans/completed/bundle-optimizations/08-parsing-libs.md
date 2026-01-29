# Plan 08: Defer or Slim HTML/XML Parsing Libs (Medium Priority)

## Goal

Reduce client bundle by **tens of KB each** from **he** (~68 KB), **@xmldom/xmldom** (~57 KB), **dom-serializer**, **node-html-parser**, **css-select**, **domutils**, **domhandler**, **css-what** by loading them only when needed or by using lighter alternatives. Medium priority; execute after Phase 1 (01–03).

## Usage

- **transcriptator** ([apps/web/src/utils/transcript.ts](apps/web/src/utils/transcript.ts)) — `convertFile`, `TimestampFormatter`; likely pulls in he, xmldom, node-html-parser, etc.
- **isomorphic-dompurify** ([DescriptionRenderer](apps/web/src/components/Description/DescriptionRenderer.tsx)) — DOMPurify for sanitizing descriptions.
- **react-markdown** ([UpdatesClient](apps/web/src/app/updates/UpdatesClient.tsx)) — markdown rendering on updates page.

Parsing libs are used for transcript conversion, description sanitization, and (indirectly) markdown. They don't need to be in the main bundle for initial load.

## Scope

- `apps/web/src/utils/transcript.ts`
- `apps/web/src/components/Description/DescriptionRenderer.tsx`
- `apps/web/src/app/updates/UpdatesClient.tsx`
- Any other client usage of transcriptator, DOMPurify, or heavy HTML/XML parsers

## Implementation options

### Option A: Lazy-load transcript / description / updates

- Lazy-load **transcript utils** (e.g. `convertFile`, `TimestampFormatter`) only when transcript UI is shown or when a transcript is requested.
- Lazy-load **DescriptionRenderer** or the DOMPurify-dependent path only when a description is rendered (e.g. episode/clip details, expandable sections).
- Lazy-load **UpdatesClient** (or the react-markdown–dependent part) so parsing libs used there load only on the updates page.
- Use `next/dynamic`, `React.lazy` + `Suspense`, or dynamic `import()` as appropriate. Ensure SSR and critical UI are not broken.

### Option B: Lighter parsing / sanitization

- Evaluate lighter alternatives for transcript parsing, description sanitization, or markdown rendering if they can replace he, xmldom, or other heavy deps without changing behavior.
- Prefer options that reduce dependency surface while preserving security and correctness.

Choose Option A, B, or a combination based on impact and risk. Ensure lazy-loading does not break SSR or critical rendering paths.

## Verification

1. `npm run build:packages` then `npm run build` in `apps/web`.
2. `cd tools/web-perf/bundle-analyzer && npm run analyze:web` with a new report name (e.g. `post-parsing-libs`).
3. Confirm he, @xmldom/xmldom, and related parsers are reduced or moved to lazy chunks.
4. Manually test: transcript conversion and display, episode/clip descriptions, updates page. Confirm no regressions.
5. `npm run lint` passes.

## Success criteria

- Parsing libs are either lazy-loaded with transcript/description/updates or replaced by lighter alternatives.
- Main client bundle size is reduced; transcript, description, and updates behavior and security are unchanged.

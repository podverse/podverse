# Goal

Add a clearly visible border around each embed iframe container (outside the iframe content) using the
same color token used by divider components.

# Scope

- Demo preview iframe wrapper styles:
  - `apps/web/src/styles/components/embed/EmbedDemoPreview.module.scss`
  - `apps/web/src/components/embed/EmbedDemoPreview.tsx`
- Share modal iframe preview wrapper styles:
  - `apps/web/src/components/Modal/ModalEmbedBuilder.module.scss`
  - `apps/web/src/components/Modal/ModalEmbedBuilder.tsx`
- Divider color token reference:
  - `packages/ui/src/components/layout/Divider/Divider.module.scss`
  - `packages/ui/src/styles/_themes.scss`
- Optional snippet/docs alignment for external embeds:
  - `apps/web/src/lib/embed/buildEmbedIframeCode.ts`
  - `docs/features/EMBED-PLAYER.md`

# Steps

1. Replace non-canonical border token usage in iframe wrapper SCSS with the same divider border token
   (`--border-color-opaque`) in:
   - `EmbedDemoPreview.module.scss` (`.frame`)
   - `ModalEmbedBuilder.module.scss` (`.previewFrame`)
2. Keep iframe element borders disabled (`border: 0`) so the border remains visibly outside the iframe,
   applied by the wrapper container only.
3. Verify wrapper radius/overflow behavior still clips iframe corners correctly after border token change.
4. Check for any other embed wrapper styles using undefined or mismatched border tokens and normalize
   them to the divider-aligned token where applicable.
5. Decide whether generated copy/paste iframe snippet should include a bordered wrapper recommendation;
   if yes, update `buildEmbedIframeCode.ts` output and `EMBED-PLAYER.md` docs together.
6. Add or adjust targeted E2E expectations/screenshots for demo and share-builder iframe previews if
   current tests assert visual wrapper styles.

# Done Criteria

- Each Podverse-managed embed iframe preview has a visible outer border.
- Border color matches divider styling token usage (`--border-color-opaque`).
- No iframe-inner border is introduced; border remains wrapper-level.
- Any snippet/docs guidance for external host pages is consistent with chosen wrapper strategy.

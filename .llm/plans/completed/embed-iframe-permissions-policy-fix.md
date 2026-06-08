# Goal

Remove Podverse-controlled embed iframe permission warnings by standardizing and modernizing iframe
`allow` attributes across all embed snippet and preview surfaces.

# Scope

- Iframe attribute source and shared contract in:
  - `apps/web/src/lib/embed/buildEmbedIframeCode.ts`
- In-app iframe consumers:
  - `apps/web/src/components/Modal/ModalEmbedBuilder.tsx`
  - `apps/web/src/components/embed/EmbedDemoPreview.tsx`
- Documentation alignment:
  - `docs/features/EMBED-PLAYER.md`
- Targeted tests for iframe output consistency:
  - `apps/web/src/lib/embed/__tests__/buildEmbedUrl.test.ts` (or new focused iframe-code test)

# Steps

1. Define a single embed iframe permission contract in
   `apps/web/src/lib/embed/buildEmbedIframeCode.ts` and use it as the source of truth for iframe
   `allow` values.
2. Replace legacy `allow="autoplay; encrypted-media"` usage with a browser-compatible policy format
   and remove any unused permission tokens.
3. Update `ModalEmbedBuilder.tsx` preview iframe and `EmbedDemoPreview.tsx` demo iframes to consume
   the shared contract instead of hardcoded strings.
4. Ensure generated snippet output from `buildEmbedIframeCode` matches the same contract used by UI
   previews, avoiding divergence between copy/paste embed code and internal previews.
5. Update `docs/features/EMBED-PLAYER.md` iframe examples to match the finalized runtime attribute
   contract.
6. Add or update test coverage to assert generated iframe attributes remain synchronized and avoid
   regressions.

# Done Criteria

- All Podverse-managed embed iframe surfaces use one shared `allow` contract.
- Unsupported feature warnings tied to old iframe permission syntax are no longer produced by
  Podverse-controlled iframe markup.
- Docs and tests reflect the final iframe permission contract.

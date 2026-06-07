# Podverse Embed — gap closure summary

## Context

Phases 1–5 of `podverse-embed` are implemented and archived under
`.llm/plans/completed/podverse-embed/`. This follow-up set closes **serious**
gaps found in post-implementation review — not new product scope.

## What shipped successfully

- Typed `/embed/**` routes, minimal chrome via `AppChrome`, SSR noindex on embed layout.
- Single and list embed shells with inline playback, video placeholder (channel-medium detection).
- Public-only list visibility for playlists; channel gating via `feed_policy.public_visible`.
- `buildEmbedUrl.ts` as canonical URL builder (with unit tests); Share → Embed Builder handoff.
- Demo index, seed fixtures, split E2E specs, and `docs/features/EMBED-PLAYER.md`.

## Serious gaps (why this plan set exists)

### 1. Playback guardrails partially wired

`00-SUMMARY.md` (original plan) lists three embed-mode guardrails. Only
`skipAutoQueueMutations` is consumed in `useMediaPlayerResourceUpdate`.

`skipAnonymousPlaybackRestore` and `skipMainAppLayoutMutations` are defined on
`EMBED_PLAYBACK_GUARDRAILS` but **never read** by runtime code. Embed routes
currently avoid symptoms because `AppChrome` omits restore/queue/dock controllers and
`updateLayoutForMediaPlayer` no-ops when `#media-player` is absent — but the contract
is not enforced at the shared playback entry points. Future refactors (e.g. mounting
`MediaPlayerController` on embed, client navigations) could regress.

### 2. Phase 5 E2E matrix incomplete

Phase 5 acceptance required coverage of the full route matrix. Current gaps:

| Missing coverage | Plan reference |
| --- | --- |
| Invalid ID on chapter and official-clip routes | Phase 5 test matrix |
| Track route `autoplay` / `t` query normalization | Phase 5 test matrix |
| List shell fixed height (~640px) assertion | Phase 5 behavior assertions |
| List internal scroll when rows overflow | Phase 5 behavior assertions |
| Playlist `play_id_text` invalid fallback | Phase 5 test matrix |
| Non-public **channel** list negative case (seed + E2E) | Phase 5 fixture table |
| Demo index smoke for all 12 demo links (only 3 today) | Phase 5 demo index spec |
| SEO noindex for additional child paths (track, playlist, official-clip) | Phase 5 SEO extension |

### 3. Share builder E2E too narrow

Phase 4 mapping table covers podcast/album list toggle, track, clip, chapter, and
playlist contexts. E2E only exercises episode and official-clip handoffs today.

## Out of scope (documented limitations, not gaps)

- Enclosure-based video detection on audio channels (phase-1 uses channel `medium_id`).
- Color customization in builder (placeholder only).
- Orphan `EmbedRoutePlaceholder.tsx` — cleanup in phase 3 of this set, not functional.

## Deliverables

- `00-EXECUTION-ORDER.md`
- `01-playback-guardrail-hardening.md`
- `02-e2e-matrix-and-fixtures.md`
- `03-share-builder-e2e-and-cleanup.md`
- `COPY-PASTA.md`

## Verification (cumulative, after all phases)

```bash
npm run lint
npm run test:unit
make e2e_seed_web
make e2e_test_web_report_spec SPEC=e2e/embed-routes.spec.ts
make e2e_test_web_report_spec SPEC=e2e/embed-share-builder.spec.ts
make e2e_test_web_report_spec SPEC=e2e/embed-demo-index.spec.ts
make e2e_test_web_report_spec SPEC=e2e/seo-noindex-routes.spec.ts
```

Review screenshot reports at `.artifacts/e2e-reports/latest/web/index.html`.

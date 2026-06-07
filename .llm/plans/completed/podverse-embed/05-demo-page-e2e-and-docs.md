# 05 — Demo page, E2E coverage, and docs

## Objective

Finalize developer/operator visibility and regression protection for embed behavior via a dedicated demo
page, E2E tests, and documentation.

## Prerequisites

- Phases 1–4 complete.
- Fixture prerequisites below satisfied (seed + constants) before writing E2E specs.

## Scope

- Build dedicated embed demo coverage under `/embed` for all variant demos.
- Add E2E coverage split across focused spec files (see below).
- Add/update docs for route/URL contract and embed usage examples.
- Extend SEO noindex E2E for child embed routes.

## File targets

- `/apps/web/src/app/embed/page.tsx` (demo index with stable links)
- `/apps/web/e2e/embed-routes.spec.ts` (new)
- `/apps/web/e2e/embed-share-builder.spec.ts` (new)
- `/apps/web/e2e/embed-demo-index.spec.ts` (new, optional)
- `/apps/web/e2e/helpers/embedAssertions.ts` (new)
- `/apps/web/e2e/helpers/seedConstants.ts` (extend with embed constants)
- `/apps/web/e2e/seo-noindex-routes.spec.ts` (extend for `/embed/**` child paths)
- `/tools/web/seed-e2e.mjs` (extend fixtures — see prerequisites)
- Docs under `/docs/**` for operator/developer embed guidance

## E2E fixture prerequisites

Add/extend seed data and export constants in `seedConstants.ts` **before** writing E2E specs:

| Fixture need | Seed action | Constant(s) |
| --- | --- | --- |
| Single audio (episode) | reuse existing | `E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT` |
| Single audio (track) | reuse existing | `E2E_MUSIC_TRACK_ONE_ID_TEXT` |
| Single audio (clip) | reuse existing | `E2E_CLIP_ID_TEXT` |
| Chapter title append | reuse + export chapter IDs | `E2E_PODCAST_ITEM_CHAPTERED_ID_TEXT`, new `E2E_ITEM_CHAPTER_*_ID_TEXT` |
| Official clip | reuse existing | `E2E_SOUNDBITE_ID_TEXT` |
| Single video placeholder | **add** video channel + item with `video/mp4` enclosure | new `E2E_EMBED_VIDEO_*` constants |
| List audio (podcast) | stagger podcast item `pub_date` offsets | `E2E_PODCAST_CHANNEL_ID_TEXT`, document expected default `id_text` |
| List audio (album) | reuse music album (already staggered) | `E2E_MUSIC_ALBUM_ID_TEXT`, `E2E_MUSIC_TRACK_ONE_ID_TEXT` as default |
| List audio (playlist) | **add** public playlist + resources | new `E2E_EMBED_PLAYLIST_*` constants |
| List video placeholder | video item in list context | tie to video seed above |
| Valid `play_id_text` | reuse second podcast/music track IDs | `E2E_PODCAST_ITEM_RESUME_NEAR_END_ID_TEXT`, `E2E_MUSIC_TRACK_TWO_ID_TEXT` |
| Invalid `play_id_text` | use literal `'invalid-id-text'` in spec | — |
| Non-public playlist (negative) | **add** private playlist seed | new `E2E_EMBED_PRIVATE_PLAYLIST_ID_TEXT` |

Document expected default row `id_text` per list route on `/embed` demo index.

## E2E spec split

| Spec | Responsibility |
| --- | --- |
| `embed-routes.spec.ts` | Direct `/embed/...` navigation (anonymous), route matrix, media-type, query params, visibility negative case |
| `embed-share-builder.spec.ts` | Share → Create Embed → Builder handoff, URL/code output, official-clip path regression |
| `embed-demo-index.spec.ts` | `/embed` demo links resolve (optional smoke) |
| `seo-noindex-routes.spec.ts` | SSR noindex for `/embed` + child paths (e.g. `/embed/episode/…`, `/embed/podcast/…`) |

Use `embedAssertions.ts` helpers — **do not** reuse `aside#media-player` assertions from main-app specs.

## Test matrix requirements

### Route-level (anonymous navigation preferred for embed realism)

| Route | Audio shell | Video placeholder | Invalid ID | Query normalization |
| --- | --- | --- | --- | --- |
| `/embed/episode/[id]` | yes | yes (video item) | yes | `autoplay`, `t` |
| `/embed/track/[id]` | yes | — | yes | `autoplay`, `t` |
| `/embed/clip/[id]` | yes | — | yes | — |
| `/embed/chapter/[id]` | yes + title suffix | — | yes | — |
| `/embed/official-clip/[id]` | yes | — | yes | — |
| `/embed/podcast/[id]` | list + default row | video row placeholder | yes | `play_id_text` valid/invalid |
| `/embed/album/[id]` | list + default row | — | yes | `play_id_text` valid/invalid |
| `/embed/playlist/[id]` | list + default row | — | yes + non-public negative | `play_id_text` valid/invalid |

### Behavior assertions

- Fixed-height shell present (`embed-root` bounding box stable).
- Single-line truncation on `embed-title` (overflow hidden, no wrap).
- Chapter suffix in title for chapter route.
- List internal scrolling when rows exceed panel (`embed-list-region`).
- Builder preview `src` includes query string when toggling autoplay/start time.
- Autoplay: assert URL/query contract and loaded shell — defer real audio autoplay playback to unit layer
  unless using mocked media harness.

## Docs requirements

Add/update docs under `/docs/**` covering:

- supported typed routes (mapping table from `00-SUMMARY.md`),
- minimal query parameters and normalization/fallback rules,
- public-only list visibility policy,
- hidden advanced `play_id_text` override,
- embed iframe integration example,
- known phase-1 limitations (video placeholder, color customization placeholder, no private playlists).

## Acceptance criteria

- `/embed` demo page shows all variant demos with stable seeded links.
- E2E specs above cover the route matrix and share/builder flow.
- SEO noindex E2E passes for `/embed` and at least two child embed paths.
- Docs describe routes, params, visibility policy, and limitations.
- Cumulative verification commands documented in `COPY-PASTA.md`.

## Cumulative verification (operator)

```bash
npm run lint
npm run test:unit
make e2e_test_web_report_spec SPEC=e2e/embed-routes.spec.ts
make e2e_test_web_report_spec SPEC=e2e/embed-share-builder.spec.ts
make e2e_test_web_report_spec SPEC=e2e/seo-noindex-routes.spec.ts
```

Review screenshot reports at `.artifacts/e2e-reports/latest/web/index.html`.

# Sub-Plan 07b: podcast:alternateEnclosure (item)

**Parent:** [07-complex-tags-implementation.md](07-complex-tags-implementation.md). Execute after 01–03; can run in parallel with 07a, 07c (07d last).

## Objective

Emit one or more `<podcast:alternateEnclosure>` per item with required type, length, and `<podcast:source>` children so Partytime parses and parser-mapping item enclosure compat populates alternativeEnclosures. **Every item should offer both audio and video alternate enclosures** (where assets exist) so clients can be tested across formats, regardless of feed medium (podcast/video/music). Support **multiple audio and video file types** so various codecs and containers can be tested.

## Authority

- **Spec:** [Podcast Namespace: Alternate Enclosure](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/tags/alternate-enclosure.md) — parent `<item>`, count multiple. Node value: one or more `<podcast:source>` (uri) and optionally one `<podcast:integrity>`. Attributes: **type** (required, MIME), **length** (recommended, bytes); optional: **bitrate**, **height** (video), **lang** (BCP 47), **title**, **rel** (grouping; "default" = alternative to enclosure; title/rel ≤32 chars for UX), **codecs** (RFC 6381), **default** (boolean, preferred/same-as-enclosure).
- **Partytime:** `phase-3.ts` — `Phase3AltEnclosure`, `alternativeEnclosure` (item). Required: `type`, `length`, at least one source with `uri`; `contentType` defaults from type. Optional: `default` (boolean), `bitrate`, `height`, `lang`, `title`, `rel`, `codecs`, `integrity` (SRI or PGP).
- **Parser-mapping:** item compat (alternativeEnclosures array).

## Design: Audio and video alternates per item

- **Feed medium vs. alternates:** The primary `<enclosure>` is determined by feed kind (e.g. podcast/music → audio, video → video). **Regardless of medium, each item may include both audio and video versions** inside `<podcast:alternateEnclosure>`. So a podcast (audio) feed can have items whose primary enclosure is MP3 and whose alternateEnclosures include both additional audio formats (e.g. OGG) and video formats (e.g. MP4, WebM); similarly, a video feed can have items with primary video enclosure and alternates that include audio (MP3, OGG) and other video (WebM). This allows tests to cover format switching and multiple types per item.
- **Multiple file types for testing:** To exercise different codecs and containers, the generator should reference and produce several types:
  - **Audio:** `audio/mpeg` (MP3 — already in pool), plus at least one other (e.g. `audio/ogg` for OGG). Optional: `audio/mp4` (M4A) if desired.
  - **Video:** `video/mp4` (MP4 — already in pool), plus at least one other (e.g. `video/webm` for WebM). Optional: additional video types as needed for tests.
- **Asset expansion:** Increase the set of generated assets so that alternate enclosures point to real files. That implies:
  - **New formats in AssetGenerator:** Add generation for at least one extra audio format (e.g. OGG) and one extra video format (e.g. WebM), with the same skip-if-exists and cap discipline as MP3/MP4 (e.g. cap 100 per type). See [../10-test-data-spec.md](../10-test-data-spec.md); extend the “100 per type” rule to the new types (e.g. 100 OGG, 100 WebM).
  - **ensureMediaAssets / pool:** When ensuring media assets, generate not only `audio-NNN.mp3` and `video-NNN.mp4` but also `audio-NNN.ogg` (or equivalent) and `video-NNN.webm` up to the same pool size (capped at 100 per type). Naming should be consistent (e.g. same index N across formats so item 1 can reference audio-001.mp3, audio-001.ogg, video-001.mp4, video-001.webm).
  - **Asset server:** Ensure MIME types for the new extensions (e.g. `.ogg` → `audio/ogg`, `.webm` → `video/webm`) in [tools/test-assets/src/asset-server.ts](tools/test-assets/src/asset-server.ts).

## Implementation

- Structure follows the [alternate-enclosure spec](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/tags/alternate-enclosure.md): each `<podcast:alternateEnclosure>` has required `type` (MIME), recommended `length`, and one or more `<podcast:source uri="..."/>`; optional `<podcast:integrity>` if needed.
- Per item, emit **multiple** `<podcast:alternateEnclosure>` elements:
  - At least one **audio** alternate (e.g. `type="audio/mpeg"` with source pointing to `audio-N.mp3`, and optionally `type="audio/ogg"` with source pointing to `audio-N.ogg`).
  - At least one **video** alternate (e.g. `type="video/mp4"` with source pointing to `video-N.mp4`, and optionally `type="video/webm"` with source pointing to `video-N.webm`).
- Use the same pool index (or round-robin) as the primary enclosure for that item so referenced files exist. Set `length` (bytes) from a known or estimated size; optional attributes: `bitrate`, `height` (for video), `lang`, `title`, `rel`, `codecs` as needed for tests. Skip or stub integrity unless required.
- Apply to **all items** (or a configurable subset) so that every item has both audio and video alternates where assets exist; this maximizes test coverage.

## Implementation steps

1. **AssetGenerator:** Add methods to generate OGG (e.g. `generateOGG`) and WebM (e.g. `generateWebM`) with the same duration/skip-if-exists pattern as MP3/MP4. Use FFmpeg (e.g. libvorbis for OGG, libvpx-vp9 or similar for WebM). Respect 100-file cap per type.
2. **ensureMediaAssets:** Extend to generate the new formats for the same pool indices (e.g. for each index 1..poolSize, generate audio-N.mp3, audio-N.ogg, video-N.mp4, video-N.webm). Update [10-test-data-spec.md](../10-test-data-spec.md) to document the new types and caps.
3. **Asset server:** Add MIME types for `.ogg` and `.webm` (and any other new extensions).
4. **buildFeed:** For each item, in addition to the primary enclosure, build 2–4 `<podcast:alternateEnclosure>` blocks: one for audio/mpeg (MP3), one for audio/ogg (OGG), one for video/mp4 (MP4), one for video/webm (WebM). Each with at least one `<podcast:source uri="..." contentType="..."/>`. Use pool indices so URLs point to existing files (e.g. same index as item’s enclosure or round-robin). Set `length` (e.g. from a constant or rough estimate if actual file size is not available at build time).
5. Remove or update placeholder comment for podcast:alternateEnclosure from Sub-Plan 04.
6. Run generate; parse with Partytime; run item enclosure compat; confirm alternativeEnclosures array is populated with multiple types (audio and video) per item.

## Acceptance criteria

- Generated feeds include multiple valid `<podcast:alternateEnclosure>` per item: at least one audio and one video type; ideally two audio (e.g. MP3, OGG) and two video (e.g. MP4, WebM) so various file types are testable.
- All referenced alternate enclosure URLs resolve to real files under assets (audio/*, video/*) with correct Content-Type.
- Partytime parses without error; parser-mapping item compat populates alternativeEnclosures with entries for different types.
- Regardless of feed medium (podcast, video, music), items can include both audio and video alternate enclosures.

## Run after this plan

From repo root: `npm run generate -w podverse-test-assets -- 2 --items 20 --multi 2`. Parse a generated feed with Partytime; run parser-mapping item compat. Confirm alternativeEnclosures present with both audio and video types per item. Fetch a few alternate enclosure URLs and confirm they return 200 with correct MIME type.

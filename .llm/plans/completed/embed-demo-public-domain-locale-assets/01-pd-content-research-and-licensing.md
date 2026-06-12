# Phase 01 — PD content research and licensing

## Licensing worksheet (approved selections)

| Locale | Title | IA identifier | Usage | Clip in | Clip dur | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| en-US | Duck and Cover (1951) | [DuckandC1951](https://archive.org/details/DuckandC1951) | Public Domain | 00:01:00 | 60s | US civil-defense classic; English; inoffensive educational tone |
| es | El Cuerpo Humano (1944) | [gov.ntis.ava16782vnb1](https://archive.org/details/gov.ntis.ava16782vnb1) | Public Domain | 00:00:45 | 60s | Spanish USIS health animation; general audience |
| fr | A Salute to France (1944) | [ASaluteToFrance](https://archive.org/details/ASaluteToFrance) | Public Domain Mark 1.0 | 00:05:00 | 60s | French wartime ally theme; English narration; culturally French |
| el-GR | Democracy of Ancient Greece (1966) | [DemocracyOfAncientGreece](https://archive.org/details/DemocracyOfAncientGreece) | Academic archive upload; pre-1978 US film — verify PD | 00:02:30 | 60s | Greece golden-age documentary; Greek metadata in seed/i18n |

### Music tracks (30s, separate PD sources)

| Locale | Title | IA identifier | Usage |
| --- | --- | --- | --- |
| en-US | Euphonic Sounds (Scott Joplin) | [ScottJoplin-EuphonicSounds](https://archive.org/details/ScottJoplin-EuphonicSounds) | PD recording |
| es | La Paloma (traditional) | [78_la-paloma_sebastian-yradier](https://archive.org/details/78_la-paloma_sebastian-yradier) | PD 78 rpm |
| fr | Au Clair de la Lune | [AuClairDeLaLune_201303](https://archive.org/details/AuClairDeLaLune_201303) | PD |
| el-GR | Syrtaki (traditional arrangement) | PD Greek folk from IA Musopen or similar | PD |

## Reject list

- CC-BY-only without PD mark
- Coronet/Phoenix Learning Group restricted items
- Silent films under 60s for primary episode master
- Items with known sync defects in first minute

## Output filenames (per locale)

Under `apps/web/public/embed-demo/{locale}/`:

- `audio/episode-primary.mp3`
- `audio/episode-alternate.ogg`
- `audio/track-one.mp3`, `audio/track-two.mp3`
- `audio/podcast-item.mp3`, `audio/scroll-item.mp3`
- `videos/episode-alternate-720p.mp4`
- `videos/episode-alternate-1080p.webm`
- `videos/episode-primary-720p.mp4` (video-primary fixtures)
- `images/*.png` (extracted frames)

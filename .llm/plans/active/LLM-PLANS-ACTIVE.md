# `.llm/plans/active/`

In-progress multi-step plan sets (one directory per feature or initiative). **Not** `.llm/templates/` —
templates are blanks; this directory holds real plan instances.

- Keep each plan file under 300 lines; split into numbered files when larger.
- Use `00-EXECUTION-ORDER.md`, `COPY-PASTA.md`, and numbered plans per repo convention.
- When finished, move the set to `plans/completed/` (see **plan-completion** skill).
- See [LLM.md](/.llm/LLM.md).

## Indexed sets

_Active (non-mobile):_ `media-player-livestream-hls-migration/`,
`web-e2e-coverage-high-level/`, `route-navigation-loading-warning/`,
`web-404-hardening-deferred/`, `doc-link-path-missed-followup/`.

_Recently completed (mobile):_
[mobile-pg8-car-android-auto](../completed/mobile-pg8-car-android-auto/) (12.11–12.17, 12.19, 12.20 —
Android Auto native browse + play from cache; iOS CarPlay 12.7–12.10 / 12.18 is a later slice pending
the Apple CarPlay entitlement),
[mobile-pg8-car-native-cache](../completed/mobile-pg8-car-native-cache/) (12.1–12.6),
[mobile-track13-downloads](../completed/mobile-track13-downloads/) (13.1–13.10),
[mobile-track9d-playlist-authoring](../completed/mobile-track9d-playlist-authoring/)
(9d.1–9d.5),
[mobile-track11-video](../completed/mobile-track11-video/),
[mobile-pg5-video](../completed/mobile-pg5-video/) +
[mobile-pg5-video-gaps](../completed/mobile-pg5-video-gaps/).

Operator visual polish remains **Track 23** only (after feature bulk + operator briefs).

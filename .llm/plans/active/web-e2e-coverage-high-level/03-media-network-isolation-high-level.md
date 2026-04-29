# 03 — Media and network isolation (high-level)

## Goal

Keep the primary E2E suite deterministic by preventing third-party media/image dependencies while still validating playback UI behavior.

## Policy

- Deny external outbound requests by default during E2E.
- Allow only local app/API/sidecar/fixture origins.
- Fail tests on unexpected third-party calls.

## Staged media strategy

1. Stage A (primary suite)
- Validate UI playback behavior using local fixtures/mocked media endpoints.
- Validate controls, state transitions, queue interactions, and player visibility.

2. Stage B (later)
- Separate deep playback fidelity with real streams in dedicated non-blocking runs.

## Coverage focus

- Audio/video/livestream controller switching.
- Player controls and state transitions.
- Artwork/media URL loading paths without real external assets.

# 08 — E2E matrix: likes + full/mini media-player overlay hierarchy

This phase applies the foundation from [07](./07-e2e-media-player-test-foundation.md) to produce final behavior-proof E2E coverage with screenshot reports.

## Required behavior coverage

### A) Likes behavior (web)

- Logged-out user still **sees** like affordance on planned surfaces.
- Interaction opens login-required flow/modal.
- No likes membership/toggle API call is made before login.
- After login, like toggle works and state updates.

Minimum surfaces in this phase:

- Episode row More menu
- Track row More menu
- Clip row More menu
- At least one header-level like control
- VTS heart path (when active per 04)

### B) Media-player overlay hierarchy (full + mini)

Verify the same precedence in both full-size info and mini info:

1. VTS remote metadata (with in-system match) wins
2. Chapter with `toc: false` wins over overlapping non-`toc:false`
3. Other chapters
4. None

Also verify overlap tie-break when ambiguous: first-position candidate wins.

## Proposed spec layout

- `apps/web/e2e/likes-auth-and-more-menu.spec.ts`
  - logged-out visibility + modal/no API
  - logged-in toggle sanity check
- `apps/web/e2e/media-player-overlay-hierarchy.spec.ts`
  - full player + mini player assertions for VTS/tocFalse/chapter/none
  - tie-break test

Use concise top-level `describe`, verbose test titles and step labels per e2e readability conventions.

## Screenshot/report requirements

- Use report targets with step screenshots:
  - `make e2e_test_web_report_spec SPEC=apps/web/e2e/likes-auth-and-more-menu.spec.ts`
  - `make e2e_test_web_report_spec SPEC=apps/web/e2e/media-player-overlay-hierarchy.spec.ts`
- When asserting a specific element, pass that verified element to screenshot capture helper logic (per screenshot-centered rule/skill).

## Data and fixture requirements

- Reuse deterministic scenarios from [07](./07-e2e-media-player-test-foundation.md).
- Each test should reference explicit fixture IDs/slugs (not fuzzy content matching).
- Keep one deterministic expected result per test (no “either A or B” acceptance).

## Deliverables (08)

- [ ] Two spec files (likes/auth + overlay hierarchy)
- [ ] Coverage for VTS / toc:false / chapter / none + tie-break in full and mini contexts
- [ ] Logged-out like behavior coverage with explicit “no API before login” check
- [ ] Scoped screenshot HTML reports for each spec

## Exit criteria

- Running the two scoped make commands above produces passing tests and screenshot-rich reports that clearly demonstrate hierarchy and like auth behavior.

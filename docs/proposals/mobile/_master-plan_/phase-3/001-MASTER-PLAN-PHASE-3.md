# Podverse Mobile — Master Plan (Phase 3, V4V)

> **Not started.** Detail docs are authored just-in-time when the operator starts this phase.
> Phase index: [PHASES.md](/docs/proposals/mobile/_master-plan_/PHASES.md)

## Scope

Real value-for-value support on mobile: LNURL boost flow, wallet/provider connection, boostagrams,
and streaming sats. Phase 1 shipped only a **placeholder** — step 19.12 wired the full-player V4V
button to a stub screen
([565 carried forward](/docs/proposals/mobile/_master-plan_/phase-1/001-MASTER-PLAN.md)).

## Carried from Phase 1

| Step | Carried from | What                                                                 | Model  |
| ---- | ------------ | -------------------------------------------------------------------- | ------ |
| P3.1 | 19.6         | V4V boost entry on full player with LNURL flow, mirroring web parity | Opus 5 |

## Legacy reference screens

The legacy app (`../podverse-rn`) has a fully built V4V surface worth reviewing before designing this
phase. Treat it as inspiration, not a port target
([`legacy-app-reference`](/.cursor/rules/legacy-app-reference.mdc)):

`V4VProvidersScreen`, `V4VProvidersAlbyScreen`, `V4VProvidersAlbyLoginScreen`, `V4VConsentScreen`,
`V4VPreviewScreen`, `V4VBoostagramScreen`, `V4VInfoStreamingSatsScreen`,
`FundingNowPlayingItemScreen`, `FundingPodcastEpisodeScreen`.

## Web parity references

- [V4V MetaBoost + LNURL](/docs/v4v/bitcoin/lnd/V4V-METABOOST-LNURL.md) — boost flow and local setup

## Open questions to resolve before detailing

- Which wallet providers are in scope for v1 (Alby only, or a provider abstraction)?
- Is streaming sats in scope, or boosts only?
- Does mobile reuse the web LNURL flow in an in-app browser, or go native?
- How does this interact with store policy on digital goods (relevant to
  [Phase 5](/docs/proposals/mobile/_master-plan_/phase-5/001-MASTER-PLAN-PHASE-5.md))?

## Detail ID band

**900–929.** Grep this directory and the table above for collisions before assigning.

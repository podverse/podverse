# 359-v4v-boost-entry-stub

**Master step:** 11.14
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Boost/V4V entry on full player where store-compliant (integrates Track 19).
- Stub button/entry that hides on F-Droid or when disabled by config.

## Architecture notes

Gate on store/FOSS rules from Track 19/20 proposals. Do not ship non-compliant Google Play
bitcoin UX.

## Edge cases / cross-track deps

- F-Droid vs Play flavor flags
- Cross-track Track 19.6

## Acceptance criteria

- Entry visible only when allowed by flavor/config
- Does not implement full LNURL flow yet (Track 19)
- No crash on press (navigate stub or explain)

## Web parity references

- [DOCS-MOBILE proposals V4V / membership]
- Master 19.6 / 565

## Verification

```bash
# manual flavor check
```

## Depends on

- 11.5

## Implementation notes

- Config-gated stub: `isMobileV4vEnabledFromEnv()` (`EXPO_PUBLIC_MOBILE_V4V_ENABLED === '1'`)
  surfaced as `getMobileConfig().isV4vEnabled`. Hidden by default, so store-restricted builds
  (F-Droid / Play) simply never set the flag — no non-compliant bitcoin UX ships.
- When enabled, the full player shows a `full-player-v4v` button that navigates to the dedicated V4V
  placeholder screen `V4vInfoScreen` (`v4v-info-screen`, root route `V4vInfo`, deep link `v4v`) — the
  earlier inline `full-player-v4v-notice` toggle was removed (Track 19.6 placeholder slice, detail 565).
  No LNURL / payment flow (deferred to Track 19); press never crashes.
- **Visibility default (decided): hidden by default.** The button stays gated by
  `EXPO_PUBLIC_MOBILE_V4V_ENABLED=1` (never flipped), keeping store-compliance acceptance criteria
  intact. Enable per build/E2E by setting the flag; Track 19.8 E2E sets it to prove the button →
  placeholder route.
- **Real V4V implementation is operator-TBD.** Web uses a browser-extension flow that does not
  translate to mobile; the mobile approach (native wallet / LNURL / other) has **not** been decided and
  will be defined manually by the operator later. This slice ships only the **placeholder screen + env
  gating + E2E** — no LNURL / wallet / payment logic — until that decision is made.

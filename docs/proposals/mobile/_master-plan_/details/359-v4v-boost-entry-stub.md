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
- When enabled, the full player shows a `full-player-v4v` button that toggles a "coming soon" notice
  (`full-player-v4v-notice`). No LNURL / payment flow (deferred to Track 19); press never crashes.

# 185-sdk-compliance-updates

**Master step:** 22.11
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Schedule **periodic SDK / target-API compliance updates**. Stores enforce minimum target SDK levels
on a rolling deadline; falling behind blocks new submissions.

## Guidance

- Track Google Play **targetSdkVersion** deadlines and Apple **SDK/Xcode** minimums; calendar a review
  each cycle (e.g. quarterly + ahead of known deadlines).
- Bump Expo SDK / RN / native target SDKs proactively; run the full mobile E2E suite after bumps.
- Refresh permissions/privacy declarations when SDKs change requirements.
- Keep the FOSS variant toolchain pins (572) in sync with these bumps.

## Acceptance criteria

- A recurring compliance-review cadence is documented with the E2E-after-bump requirement.

## Verification

```bash
# After an SDK/target bump, operator runs the mobile suite
npm run mobile:e2e:test:all
```

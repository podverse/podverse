# 446-fcm-fdroid-register

**Master step:** 14.7
**Model (author + implement):** Auto
**Status:** done

## Scope

- Document FCM (and Firebase) as a **non-FOSS dependency** in the FOSS register that Track 20 owns,
  so the F-Droid flavor excludes it and uses UnifiedPush (445) instead.
- Add/extend a dependency-audit note listing Firebase/GMS as playstore-only, with the UnifiedPush
  replacement mapping.

## Acceptance criteria

- FOSS register / audit doc lists FCM + Firebase as excluded from the FOSS flavor.
- Cross-references 445 (UnifiedPush replacement) and Track 20.3 reproducibility audit.

## Web parity references

- Skill: **mobile-fdroid-flavors**.
- Process doc: MOBILE-ONLY-FEATURES §4.
- Track 20 details (570-foss-flavor-definition, 572-foss-reproducibility-audit).

## Verification

```bash
grep -rqi "fcm\|firebase" docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md
```

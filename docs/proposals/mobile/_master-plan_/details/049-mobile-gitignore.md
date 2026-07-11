# 049-mobile-gitignore

**Master step:** 3.10
**Model (author + implement):** Auto
**Status:** done

## Scope

- Add root and/or `apps/mobile/.gitignore` entries for Expo and native build artifacts.
- Ignore `.expo/`, `ios/Pods/`, Android `build/`, `.gradle/`, and local Xcode user data.
- Align with existing `.cursorignore` native artifact patterns from Track 0 (no conflicts).
- Document which native trees are committed vs generated (prebuild policy).

## Acceptance criteria

- Step 3.10 complete per [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md)
- `.expo/` is gitignored
- iOS Pods and Android build outputs are gitignored
- Patterns do not ignore committed Expo config or `app.config.ts`
- No duplicate/conflicting rules vs `.cursorignore` entries from step 0.1 / 0.19

## Web parity references

- [DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md §2](/docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md)
- [001-cursorignore-native-artifacts](/docs/proposals/mobile/_master-plan_/details/001-cursorignore-native-artifacts.md)
- [APPS-MOBILE.md § Project layout](/apps/mobile/APPS-MOBILE.md)

## Verification

```bash
grep -q '\.expo' .gitignore apps/mobile/.gitignore 2>/dev/null || grep -rq '\.expo' .gitignore apps/mobile
grep -q 'Pods' .gitignore apps/mobile/.gitignore apps/mobile/ios/.gitignore 2>/dev/null || true
```

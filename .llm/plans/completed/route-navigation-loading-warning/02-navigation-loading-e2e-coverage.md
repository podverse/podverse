# Navigation Loading E2E Coverage

## Scope

- Add or extend E2E coverage so route navigation loading behavior is validated
  in both apps after the shared hook fix.
- Ensure coverage focuses on behavior, not implementation details.

## Why this step exists

- The warning was found in runtime navigation paths for both apps.
- Shared hook behavior should be protected by app-level regression tests, not
  only package unit tests.

## Steps

1. Web E2E:
   - Add or update a focused web spec that navigates between internal routes
     and confirms expected page load completion with no regressions in route
     transition flow.
   - Keep assertions stable and user-visible (page landmarks, headings, or
     route-specific content).
2. Management-web E2E:
   - Add or update a focused management-web spec with the same intent:
     internal route navigation remains smooth and expected content appears after
     transition.
3. Screenshot report alignment:
   - Ensure spec steps are compatible with the repository’s screenshot report
     flow.
4. Keep scope narrow:
   - Do not convert this into full-suite E2E changes; target only navigation
     loading behavior touched by the hook fix.

## Candidate areas

- Web specs under: [`/apps/web/e2e`](/apps/web/e2e)
- Management specs under:
  [`/apps/management-web/e2e`](/apps/management-web/e2e)

## Expected outcome

- Both apps have targeted E2E coverage that exercises shared route navigation
  loading behavior.
- Future regressions in shared navigation-loading logic are caught earlier.

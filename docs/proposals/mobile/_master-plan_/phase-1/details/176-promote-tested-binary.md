# 176-promote-tested-binary

**Master step:** 22.2
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Define the **release checklist**: the **same binary** tested in beta is the one promoted to
production — no rebuild between beta and prod submit.

## Checklist

1. Build once; record the build number / artifact hash.
2. Verify the beta artifact (crash-free, smoke E2E, operator polish complete).
3. Promote **that** artifact to production (App Store / Play promotion), not a fresh build.
4. Tag the release to the exact commit + build number (align with 183 release notes).
5. Confirm the **publish hold** is lifted (operator manual polish done) before any promotion.

## Acceptance criteria

- Checklist enforces same-binary promotion beta→prod.
- References the publish hold (Ship bar) and release-notes step (183).

## Verification

- Doc-only; operator follows at release time.

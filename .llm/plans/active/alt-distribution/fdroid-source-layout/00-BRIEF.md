# Source layout — same branches, and a drift scratchpad

Briefing only. Parent: [../00-INDEX.md](../00-INDEX.md).

## Purpose

Decide where the free-software code lives, and how an agent who ships a Play fix six months
later still updates the free-software build.

## Decision

**Do not create `fdroid/develop`, `fdroid/staging`, or `fdroid/main`.**

The free-software binary is a build configuration of the commit that is already on `develop`,
`staging`, or `main`. A second trio of branches means every mobile fix is done twice, and the
agent workflow we use will forget the second copy.

A short-lived branch `release/fdroid/<version>` is allowed only after a spike has shown that
the free-software build cannot be produced from the release commit. That branch is cut from
the tag, the drift file lists the patches to re-apply, and the branch is deleted after the
release. It is not a new line of development.

We do not revive `podverse-fdroid` as the NextGen source tree. That checkout is the v4 F-Droid
history. NextGen source is this monorepo. The v4 tree is reference material for how the old
listing was described, nothing else.

## Why flags and a scratchpad, instead of a fork

F-Droid compiles a git tag. Files for the Play flavor may remain in that tag. What they
compile is the flavor the recipe selects. Keeping Play-only source in the tag is normal and
is easier for agents than a fork that deletes files.

The scratchpad exists because a green Play build does not tell us the free-software build
still compiles. Agents need a file they are required to touch, plus a check that fails when
they do not.

## Drift file

Path, created by the `foss-android-build` plan: `apps/mobile/fdroid/DRIFT.md`

It is committed. It is not emptied at release. It is not `release-notes/scratchpad.md`.
Release notes describe what a user gained. This file describes what the free-software build
must keep doing.

Layout the later plan should create:

```markdown
# Free-software Android drift

Last policy re-read: YYYY-MM-DD
Pages re-read: Inclusion Policy, Anti-Features, Build Metadata Reference, AI policy issue

## Accepted differences

- Remote push is UnifiedPush. FCM is not in this binary.
- Membership purchase opens the website. Play Billing is not in this binary.

## Open blockers

- (none, or one block per library that still fails the scan)

## Patch notes for a release branch

- (none, while the same commit builds)

## History

- YYYY-MM-DD — what changed, and which PR.
```

Rules for agents, to be copied into a cursor rule in the same implementation (`mobile-fdroid-drift`):

- A PR that adds or upgrades a native module, an Expo module, or a Maven dependency under
  `apps/mobile` reads this file.
- If the free-software scan would start failing, the PR updates "Open blockers" in the same
  change, or it fixes the scan in that change.
- Emptying the file is not allowed. Striking a resolved blocker moves it to History.
- Before a stable F-Droid submission, a person re-reads the policy pages and updates the date.
  The deploy checklist includes that step.

The CI scan from the flavor brief is the enforcement. The file is the memory. Either alone
will be skipped.

## Build recipe shape

Mobile is outside the root npm workspace and depends on `file:` packages. F-Droid and GitHub
Actions both have to build from this monorepo, not from a published mobile tarball.

The recipe script:

- Uses Node from the allowed prebuilt (current Node.js is on F-Droid's allowed list) and
  Temurin or Debian OpenJDK. Not Oracle JDK.
- Builds the workspace packages the app actually imports, then `npm ci` in `apps/mobile`.
- Runs Expo prebuild with the free-software env, then Gradle `assembleRelease`.
- Does not start the API, Postgres, or the rest of the server stack.
- Does not call EAS.

F-Droid's builder has a time limit. The flavor plan records how long the script takes in a
Debian-like container. If it cannot finish there, the listing plan's fallback is our own
F-Droid repository of the **same** APK we sign, not a forked source branch. Official inclusion
stays the goal once the recipe fits.

`apps/mobile/android` is generated and gitignored. The recipe generates it. We do not commit
the generated tree to make F-Droid's life easier. A committed generated tree is a second copy
that drifts.

## Later detailed-plan steps

Most of this lands inside `foss-android-build` (the file and the cursor rule) and
`foss-listing` (the recipe text a maintainer pastes into `fdroiddata`).

The source-layout plan does not need its own implementation set beyond those two, unless the
Debian spike fails. If it fails, the detailed plan adds one section: "builder does not finish",
with the measured time, and switches the fallback to a signed binary repo. That is still not
a permanent branch.

## Operator overrides

A permanent `fdroid/*` branch trio is an override in the parent index. It is the more expensive
option. Take it only after the same-commit build has failed for a reason a script cannot fix.

## Out of scope

The contents of the Gradle scan and the notification replacement. Those are the flavor brief.

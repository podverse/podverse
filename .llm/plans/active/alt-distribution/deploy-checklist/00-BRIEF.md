# Deploy checklist — `abcdeploysteps`

Briefing only. Parent: [../00-INDEX.md](../00-INDEX.md).

## Purpose

Say how the existing deploy command learns the free-software APK, F-Droid, and the channels we
are not adding. The skill today is `.cursor/skills/abcdeploysteps/SKILL.md`. Only
`abcdeploysteps podverse alpha` writes a checklist. `beta` and `production` stop, because those
clusters do not exist.

## Decision

Do not treat F-Droid as a cluster environment. Do not make `abcdeploysteps podverse fdroid`
an alias of alpha.

Two words, two checklists:

| Command | When it starts working | What the checklist contains |
| --- | --- | --- |
| `abcdeploysteps podverse alpha` | The `foss-apk-release` workflow exists and the staging variable is on | The current alpha checklist, plus a free-software APK lane when mobile changed. |
| `abcdeploysteps podverse fdroid` | A clean APK has been published at least once, and the operator is cutting a **stable** listing | Policy re-read, drift file, metadata, reproducible-build check, F-Droid inclusion or update. No cluster pin. No EAS. No Play rollout. |

Until `foss-apk-release` exists, `podverse fdroid` stops with "the free-software pipeline is
not in place," the same way `beta` stops. The implementation of the skill should say that in
one paragraph so a future agent does not guess alpha.

Obtainium is not its own word. The alpha lane's APK is the Obtainium file. The checklist names
the asset and does not add a second build.

IzzyOnDroid is not its own word. After `izzyondroid-size` says include, the **fdroid** checklist
gains one operator step: confirm the tagged release IzzyOnDroid watches. It is not part of
every alpha.

iOS does not gain a sideload lane. The alpha checklist keeps TestFlight as it is. The skill
gains one line: do not add an IPA, AltStore, or EU marketplace step from this command.

OEM stores and Accrescent are absent from both checklists.

## Alpha lane, once the workflow is on

Add a row to the skill's "lanes that may run at the same time" table:

| Lane | Starts when | Terminal |
| --- | --- | --- |
| Free-software APK | Mobile changed, and the staging publish has created the prerelease | **Root**, after the publish letter. The workflow builds the APK. The operator does not run EAS for it. |

The checklist step is a wait on that GitHub job, then a check that the prerelease contains
`podverse-foss-arm64-v8a.apk`. It does not run `make mobile_eas_android_build`. It does not
roll out Play internal testing. Those stay the existing Android steps.

If the repository variable is still off, the lane is one sentence: the APK job is switched
off, and the operator turns it on before this lane is real. Do not hide that.

Server image publish does not wait on the APK, matching the workflow brief.

The drift file is read at the start of any checklist that includes mobile. Open blockers mean
the APK lane is omitted and the reply says why. We do not attach a binary the scan rejects.

## Stable F-Droid checklist

`abcdeploysteps podverse fdroid` writes a temp file the same way alpha does
(`/tmp/abcdeploysteps/…`, not the git repo). Steps, in order, each one a person runs:

1. Re-read the policy URLs in the policy brief. Update the date in `apps/mobile/fdroid/DRIFT.md`.
2. Confirm the drift file has no open blocker.
3. Confirm the APK on the **stable** GitHub Release (the main pipeline, not a staging
   prerelease) matches the tag we want listed.
4. Confirm the reproducible rebuild, once F-Droid is building it. Until the first inclusion,
   the step is "open or update the `fdroiddata` request" and it stays with the operator.
5. Do not change `com.podverse.app.next`. Do not submit this APK to Play.

This command refuses while `release-notes/scratchpad.md` is non-empty, for the same reason
alpha does, when the stable release is what would ship. A docs-only drift-file edit is not
"nothing to ship" if the operator asked for a listing update. The skill text should say that
explicitly so the hard stop for empty product diffs does not swallow a metadata fix.

## Later detailed-plan steps (`abcdeploysteps-foss`)

1. Re-read the skill. Keep alpha's hard stops (dirty tree, scratchpad, migrations, env).
2. Add the environment word `fdroid` to the "what the names mean" table, with the stop
   condition above.
3. Add the alpha lane table row and the wait-for-asset step.
4. Add the one-line iOS refusal.
5. Do not add Play, EAS, or kubectl steps to the fdroid checklist.
6. Point the skill at these briefs for the asset name and the policy URLs, by repo path, so
   the skill does not grow a second copy of the policy.

## Operator overrides

Running the free-software APK on every alpha before the variable is on is not something the
checklist should improvise. The operator turns the variable on. The checklist notices.

## Out of scope

Writing a checklist on the day of this briefing. Nothing is ready to deploy.

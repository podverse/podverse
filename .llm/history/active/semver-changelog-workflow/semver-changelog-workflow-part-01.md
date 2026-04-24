### Session 1 - 2026-04-23

#### Prompt (Developer)

how are these PRs supposed to work? i think we need a different, and simpler system. instead of using a "recent" file to accumulate changelog, the changelog should simply be written by the LLM continuosly as it goes. to make this work, we will now make it a part of our process to bump the version at the BEGINNING of work, rather than at the end of work. since we bump at the beginning, LLM will know which changelog to write as we go. make sure there are vs code and cursor skills to remind you of this. the change logs should go in their own separate files named after the semver. we do not need separate staging changelogs, these changelogs represent the version number which will eventually be graduated to production anyway

https://github.com/podverse/podverse/pull/154

Start implementation

#### Key Decisions

- Switched from `CHANGELOG-UPCOMING.md` accumulation to semver-named changelog files at `docs/development/CHANGELOGS/X.Y.Z.md`.
- Updated staging and main publish workflows to read release notes from the base semver changelog file.
- Removed staging post-publish changelog archive/reset PR job from publish workflow.
- Updated `scripts/publish/bump-version.sh` to create and stage the semver changelog file during version bump so changelog writing starts immediately.
- Updated release docs and release-changelog skill guidance to enforce version-first changelog authoring.
- Ran Cursor-to-Copilot sync/check so mirrored `.github` customization files stay aligned with `.cursor` source changes.

#### Files Modified

- .llm/history/active/semver-changelog-workflow/semver-changelog-workflow-part-01.md
- .cursor/skills/release-changelog/SKILL.md
- .github/skills/release-changelog/SKILL.md
- .github/workflows/publish-staging.yml
- .github/workflows/publish-main.yml
- scripts/publish/bump-version.sh
- docs/operations/PUBLISH.md
- docs/operations/ALPHA-DEPLOYMENT.md
- docs/operations/CHANGELOG-UPCOMING.md
- docs/operations/CHANGELOG-ARCHIVE/DOCS-OPERATIONS-CHANGELOG-ARCHIVE.md
- docs/development/CHANGELOGS/5.4.15.md
- .github/copilot-instructions.md
- .github/instructions/\*.instructions.md (sync rewrite updates)
- .github/skills/\*/SKILL.md (sync rewrite updates)

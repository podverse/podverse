# 183-release-notes-generation

**Master step:** 22.9
**Model (author + implement):** Auto
**Status:** done

## Scope

Align **release-notes generation** with the monorepo changelog / `bump-version` output so store
"What's New" text is consistent with the tagged release.

## Guidance

- Source release notes from the monorepo changelog / `bump-version` output for the release commit.
- Keep store "What's New" user-facing and short; link deeper detail to the changelog where allowed.
- Tag the store submission to the exact commit + build number (align with same-binary promotion 176).
- Localize store notes where store listings support it (reuse i18n copy conventions where practical).

## Acceptance criteria

- Release notes derive from changelog/bump-version, tied to the release commit/build.

## Verification

- Doc-only.

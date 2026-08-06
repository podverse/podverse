# 573-fdroid-metadata-draft

**Master step:** 20.4
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Draft the **F-Droid metadata**: summary, description, license, source/issue URLs, categories, and a
**build recipe** outline. This is the metadata skeleton the operator finalizes at submission (20.7);
it is not the submission itself.

## Metadata draft

- **Name:** Podverse (next-gen)
- **Summary:** Open-source podcast + value-for-value app (FOSS flavor).
- **License:** AGPL-3.0 (confirm against repo `LICENSE` at submission time).
- **Source Code:** monorepo repository URL (operator confirms canonical public URL).
- **Issue Tracker:** repository issues URL.
- **Categories:** Multimedia, Internet.
- **Anti-features:** none expected in the FOSS flavor (no NonFreeNet push if UnifiedPush distributor
  is user-chosen; confirm at audit 572).

## Build recipe outline

- Build the **FOSS** Android variant only (no Play Services/Firebase).
- Pin toolchain (Gradle/AGP, NDK, JDK) per the reproducibility audit (572).
- Output the FOSS APK/AAB signed with the FOSS signing key (574).

## Acceptance criteria

- A metadata draft with all required F-Droid fields exists, with `_TBD_`/operator-confirm markers
  where values need operator sign-off (license, canonical URLs).
- Build recipe references 572 (reproducibility) and 574 (signing).

## Web parity references

- **mobile-fdroid-flavors** skill; workspace `metaboost-registry` (registry submission target, 20.7).

## Verification

- Doc-only; validated when the operator submits (20.7 / 576).

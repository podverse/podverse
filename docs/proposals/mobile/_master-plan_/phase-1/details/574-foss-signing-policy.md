# 574-foss-signing-policy

**Master step:** 20.5
**Model (author + implement):** Auto
**Status:** done

## Scope

Define the **FOSS signing key policy**: the FOSS artifact is signed with a **separate key** from the
Play upload key / App Store credentials. Keys are operator-held secrets.

## Policy

- The FOSS flavor uses its **own signing key**, distinct from the Play Console upload key and any
  App Store signing identity.
- Keys are **operator-managed secrets** — never committed to the repo, never in CI logs.
- If F-Droid builds and signs the artifact on their infrastructure, document that the reproducible
  build (572) is the source of trust and the FOSS key is used for any self-published FOSS APK.

## Operator notes

- Generating/storing the FOSS signing key and configuring CI/secret stores is an **operator** step.
- Do not reuse the Play upload key for FOSS artifacts.

## Acceptance criteria

- Policy states a separate FOSS key, operator-held, never committed.
- Cross-linked from the metadata draft (573) and flavor definition (570).

## Verification

- Doc-only.

# 572-foss-reproducibility-audit

**Master step:** 20.3
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Provide the **dependency audit checklist** F-Droid requires: confirm the FOSS build is reproducible
and free of non-free dependencies and blobs. This is the running audit process; the register lives
alongside the **mobile-fdroid-flavors** skill and step `446-fdroid-register`.

## Audit checklist

1. **Native/npm dependency sweep:** for every dependency, record license + source; flag any that are
   proprietary (Firebase, Play Services, closed SDKs).
2. **Flavor gating:** ensure each flagged dep is gated to the **playstore** variant only; the FOSS
   variant must build and run without it.
3. **No prebuilt blobs:** verify no committed binary blobs are pulled into the FOSS artifact.
4. **Reproducible build inputs:** pin toolchain versions (Gradle/AGP, NDK, JDK) and document them so
   an F-Droid builder can reproduce the artifact.
5. **Runtime check:** boot the FOSS variant on a de-Googled device/emulator (no Play Services) and
   confirm core flows (playback, subscriptions, downloads, UnifiedPush registration) work.

## Register

Maintain the non-FOSS dependency register (component, license/source, FOSS status, flavor gating) per
the **mobile-fdroid-flavors** skill. Add a row in the **same PR** whenever a non-FOSS dep is added.

## Acceptance criteria

- The checklist exists and references the register + flavor-gating rule.
- Any known non-FOSS dep already has a register row and playstore-only gating.

## Web parity references

- **mobile-fdroid-flavors** skill § Non-FOSS dependency register.

## Verification

```bash
# FOSS variant must build/lint without Play Services/Firebase (once the variant is wired)
npm run lint
```

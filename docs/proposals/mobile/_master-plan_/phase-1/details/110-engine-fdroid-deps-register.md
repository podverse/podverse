# 110-engine-fdroid-deps-register

**Master step:** 2.31
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Register any non-FOSS dependencies introduced by the media engine (e.g. Google Play Services) in
  the FOSS / F-Droid register stub per Track 20 / `mobile-fdroid-flavors` skill.
- Today the engine uses Media3 ExoPlayer (Apache 2.0) — document that explicitly; if no Play
  Services are linked, the register entry is a short “none / Media3 only” note.

## Architecture notes

- Do not add Play Services solely for this step.
- If video/surface work later pulls a proprietary SDK, update the register in the same PR.

## Edge cases

- Flavor-specific deps: note playstore vs foss rows.

## Acceptance criteria

- FOSS register doc (or skill-linked stub) lists engine deps accurately.
- No silent proprietary dependency.

## Web parity references

- [012-skill-mobile-fdroid-flavors](./012-skill-mobile-fdroid-flavors.md)
- `.cursor/skills/mobile-fdroid-flavors/SKILL.md`
- Track 20

## Verification

```bash
rg -n "media3|ExoPlayer|Play Services|FOSS" apps/mobile/modules/podverse-media-engine .cursor/skills/mobile-fdroid-flavors
```

## Depends on

- Engine module present (`done`)

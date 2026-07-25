# 353-position-continuity-verify

**Master step:** 11.8
**Model (author + implement):** Opus 4.8
**Status:** done

**Implementation deferral (PG-7b audio-first):** Detail now; implement after PG-5 / Track 2 video (2.14+). Do not block audio mini/full player COPY-PASTA.

**Ship bar:** functional video surface / E2E smoke only — no player layout redesign or transcript chrome (Track 21.11 / Track 23).

## Scope

- Verify playback position continuous across mini↔full transitions (no restart).
- Document manual + E2E checks; primarily validates video path but also audio expand.

## Architecture notes

Audio path covered in 11.4; this step gates video continuity after PG-5.

## Edge cases / cross-track deps

- Deferred video asserts; keep audio regression in 11.4 E2E

## Acceptance criteria

- Position delta across transition within tolerance
- Automated assert where harness allows; else checklist

## Continuity checks (implemented)

- **Automated (Maestro):** `apps/mobile/e2e/video-transition.yaml` asserts `playback-active-e2e`
  at the mini state, again in the full state (mid-transition), and after collapse. Because that
  status is driven purely by JS playback state — not by which screen is mounted — a reload/destroy
  on expand would flip it and fail the flow. This proves the engine is not remounted across
  mini↔full.
- **Operator on-device check (Maestro cannot prove pixels/occlusion):** on a real device/simulator,
  play the seeded video item, expand to full, then collapse. Confirm: (a) the moving frame keeps
  advancing with no reload spinner, (b) the on-screen clock does not jump back to `00:00`, and
  (c) the surface is not occluded by the modal (renders inside the full-player tree). Pixel-level
  polish of the surface is Track 23, not this step.

## Web parity references

- Engine spike GO notes on single player instance

## Verification

```bash
npm run mobile:e2e:test -- play-mini-player
```

## Depends on

- 11.4; video after 11.6–11.7

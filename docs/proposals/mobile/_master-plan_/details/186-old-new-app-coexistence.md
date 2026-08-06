# 186-old-new-app-coexistence

**Master step:** 22.12
**Model (author + implement):** Auto
**Status:** done

## Scope

Document the **coexistence period**: the old-generation Podverse app and the next-gen `.next` app run
in the field simultaneously during migration.

## Notes

- The next-gen app ships under a **separate app id** (`com.podverse.app.next`) and separate store
  listing — it never overwrites the existing Prod/Beta listing (Track 4 store-safety).
- Both apps hit the same API; the **add-only discipline** (179) keeps the API compatible for both.
- Users may have both installed; account/login and playback data sync via the API. Document any
  data-migration or hand-off expectations for users moving from old → next-gen.
- Convergence (single app id) is a later decision (Track 4.25); until then, coexistence is expected.

## Acceptance criteria

- Coexistence expectations (separate id/listing, shared compatible API, dual-install) are documented.

## Verification

- Doc-only.

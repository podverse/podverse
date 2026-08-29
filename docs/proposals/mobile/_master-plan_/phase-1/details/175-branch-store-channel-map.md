# 175-branch-store-channel-map

**Master step:** 22.1
**Model (author + implement):** Auto
**Status:** done

## Scope

Document the **branch → store channel** mapping for the mobile `.next` app, aligned with the server
STAGING-MAIN promotion flow and Track 4 CI.

## Mapping

| Branch    | Store channel                                  | Notes                                 |
| --------- | ---------------------------------------------- | ------------------------------------- |
| `develop` | TestFlight Internal / Play internal testing    | Dev/internal only (Track 4.14)        |
| `staging` | TestFlight external beta / Play closed testing | Beta (Track 4.15)                     |
| `main`    | Production submit (human approval)             | Same binary promoted from beta (22.2) |

## Publish hold (v1)

No promotion to **any** tester channel (internal/beta) until the operator finishes manual visual
polish (Track 23). CI may build/sign on branches but must not auto-submit before operator sign-off.
See master plan **Ship bar** § Publish hold and Track 4 store-safety.

## Acceptance criteria

- Branch→channel table matches Track 4 CI mapping and the server promotion model.
- Publish hold is referenced.

## Verification

- Doc-only.

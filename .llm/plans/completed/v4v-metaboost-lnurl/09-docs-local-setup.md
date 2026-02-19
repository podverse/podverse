# 09 - Documentation and Local Setup

## Goal

Document the end-to-end local workflow: BoostBox at localhost, Alby Sandbox testing, LNURL setup,
and metaBoost feed configuration.

## Target Repo

- `/Users/mitcheldowney/repos/pv/podverse`

## Deliverable Docs (new)

- `docs/v4v/V4V-METABOOST-LNURL.md`
- `docs/v4v/V4V-METABOOST-FLOW.md`

## Required Content

1. **Prereqs**
   - BoostBox running at `http://localhost:8080`
   - Alby Sandbox faucet usage
   - Seeded LNURL addresses

2. **MetaBoost in feeds**
   - Example `<podcast:metaBoost schema="boostbox">http://localhost:8080/boost</podcast:metaBoost>`
   - Works alongside `<podcast:value>`

3. **End-to-end flow**
   - Parse feed → store metaBoost in DB
   - Submit boost metadata to BoostBox
   - Verify stored boost via BoostBox lookup

4. **Testing instructions**
   - LNURL payment test via Alby Sandbox
   - Expected response formats

## Output

- A single, step-by-step doc explaining how to run the feature locally.


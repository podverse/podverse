# 10 - Test Assets and Seeding

## Goal

Ensure test assets and seed data include metaBoost tags and LNURL values so end-to-end flows can be
validated locally.

## Target Repo

- `/Users/mitcheldowney/repos/pv/podverse`

## Tasks

1. **Generate test assets**
   - Update asset generator to include:
     - `<podcast:metaBoost schema="boostbox">http://localhost:8080/boost</podcast:metaBoost>`
     - `<podcast:value>` with LNURL recipients

2. **Parser outputs**
   - Ensure metaBoost data is returned by parsers.

3. **Database seeding**
   - Seed LNURL addresses and metaBoost values.
   - Verify stored values in DB tables for channel/item value.

## Output

- Test assets and local DB seeds consistently include metaBoost and LNURL data.


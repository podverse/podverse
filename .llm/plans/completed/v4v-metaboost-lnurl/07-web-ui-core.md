# 07 - Web UI (Core V4V)

## Goal

Display metaBoost details in the core V4V boost workflow and prefer metaBoost endpoints when present.

## Target Repo

- `/Users/mitcheldowney/repos/pv/podverse`

## Key Files

- `apps/web/src/components/Boost/BoostForm.tsx`
- `apps/web/src/components/Boost/BoostRecipientInfo.tsx`
- `apps/web/src/components/Media/Header/HeaderButtons.tsx`
- `apps/web/src/utils/value/appValue.ts`

## Tasks

1. **UI display**
   - Show metaBoost schema + URL in the boost flow when present.
   - Keep existing value recipient display intact.

2. **Flow preference**
   - If metaBoost exists, use its endpoint for metadata submission.
   - If metaBoost is missing, use current V4V flow (no regression).

3. **Types**
   - Use helpers-v4v-metadata types in UI.
   - Keep changes bundle-aware (avoid heavy deps).

## Output

- Core V4V UI shows metaBoost details and routes boost metadata correctly.


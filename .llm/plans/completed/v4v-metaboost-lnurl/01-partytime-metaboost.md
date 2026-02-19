# 01 - Partytime metaBoost Parsing

## Goal

Add `<podcast:metaBoost>` parsing as a sub-tag of `<podcast:value>` and expose it in the parsed
output. The metaBoost schema attribute must be present and only `"boostbox"` is accepted for now.

## Target Repo

- `/Users/mitcheldowney/repos/pv/partytime`

## Key Files

- `src/parser/phase/phase-4.ts`
- `src/parser/phase/phase-6.ts`
- `src/parser/phase/helpers.ts`
- `src/parser/types.ts`

## Tasks

1. **Define metaBoost type**
   - Add a type for metaBoost in `phase-4.ts` or `phase-6.ts`.
   - Shape: `{ schema: "boostbox"; url: string; }`
   - Validate `schema` attribute value and require a non-empty URL.

2. **Add parser for `<podcast:metaBoost>`**
   - Register using `addSubTag("value", metaBoost)`.
   - Extract `schema` attribute and text content (URL).
   - Skip/ignore if schema is missing or not `"boostbox"`.

3. **Wire into value output**
   - Extend `Phase4Value` to include `metaBoost?: Phase4MetaBoost`.
   - Ensure `Episode.value` / `FeedObject.value` carry `metaBoost`.

4. **Update types**
   - Extend interfaces in `src/parser/types.ts`.

## Notes

- Follow existing `valueTimeSplit` subtag pattern.
- Keep all parsing behavior non-throwing; invalid metaBoost should be ignored.

## Output

- Partytime emits `value.metaBoost` in parsed feed data when present.


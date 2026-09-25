# 10 — Home close-out: production-JS capture, ranked results, docs

## Goal

Close the Home set with numbers a reader can trust:

1. Review the production-JS captures **FIN** (`chips`) and **FINP** (`play`). Dev JS inflates
   JS-thread work, so these show what users of a release build will feel.
2. Rank every change in the set by its measured effect, from the ledger.
3. Record the outcome in `docs/development/mobile/MOBILE-PERF-BASELINES.md` and the temp report.
4. Leave Browse as a clearly named next step, planned from these results.

No product code changes in this milestone.

## Preconditions

- 09b reviewed (kept or reverted) and its Maestro run reported.
- The operator captured FIN and FINP (COPY-PASTA says how) and pasted the prompt with them.

## Files

- `docs/development/mobile/MOBILE-PERF-BASELINES.md`
- `.artifacts/mobile-perf/chip-switch-report.md` (temp, gitignored)

## Step 1 — Review FIN and FINP

Follow [CHECKPOINT.md § Review procedure](./CHECKPOINT.md#review-procedure-agent-when-the-operator-replies-collected-label)
steps 1–4 for both labels, with `Build` = `prod JS`. Compare FIN with the last kept `chips` row and
FINP with the last kept `play` row. There is no keep/revert rule here; write `final` as the
decision.

## Step 2 — Rank the changes

From the ledger rows, build one table: one line per milestone that has a capture (05b, 06b, 07, 08,
09b), in order of measured effect, biggest first. Columns:

| Milestone | Change | Decision | Metric that moved most | Before → after | Beyond noise floor? |

"Before" is the previous kept row of the same gesture; "after" is the milestone's own row (use the
mean of C9a and C9b for 09b). A change that stayed inside the noise floor says `no` and ranks last,
whatever the impression was. Put the operator's impressions in a sentence under the table, not in
the cells.

## Step 3 — `MOBILE-PERF-BASELINES.md`

Directly after the Chip switch ledger table, add a section:

```md
## Home chip switch — results, <today's date>

<the ranked table from Step 2>

<two to four sentences: what the user now sees on a first visit and on a revisit, the FIN numbers
against the targets in the table below, and anything that missed.>

| Target | Goal | FIN |
| --- | --- | --- |
| chipVisible p95, first visit | ≤ 50 ms | <value> |
| chipVisible p95, revisit | ≤ 34 ms | <value> |
| listVisible − chipVisible, revisit | ≤ 17 ms | <value> |
| spinnerVisible − chipVisible, first visit | ≤ 17 ms | <value> |
| taps with a gap ≥ 100 ms, revisits | 0 | <value> |
| uiMaxGap p95 | ≤ 50 ms | <value> |
```

Write numbers, not adjectives. Do not edit earlier sections of the file.

## Step 4 — Temp report

In `.artifacts/mobile-perf/chip-switch-report.md`, fill the `## Results` section at the end with
the same ranked table and target table, and replace its placeholder line.

## Do not

- Do not change product code, plan tools, or any `.cursor/` file.
- Do not start Browse work. The next set is planned separately, from these results.

## Done when

- [ ] Steps 1–4 done.
- [ ] COPY-PASTA 10 ticked. Move every remaining file in
      `.llm/plans/active/mobile-home-switch-followups/` (including `tools/`, `backup/`, 00, COPY-PASTA,
      and CHECKPOINT) to `.llm/plans/completed/mobile-home-switch-followups/`.

## Operator verification (last prompt of the set — cumulative)

The whole set has landed. Run these once, in the tabs named.

**Mobile** — type-check, unit tests, report tests:

```bash
npm run type-check:mobile
npm --prefix apps/mobile run test
node --test scripts/mobile/perf-report.test.mjs
```

The only type error allowed is the known one in `authRequestWithRefresh.test.ts`, which predates
this set.

**Mobile Maestro** — with **Mobile E2E Metro**, **Mobile E2E API**, and **Mobile E2E iOS** up as
[CHECKPOINT.md § Maestro run](./CHECKPOINT.md#maestro-run) describes (Browse is included because
05b touched its grid artwork). Add **Mobile E2E Android** (`npm run mobile:e2e:android`) to cover
Android, since 09b's kept-list code runs there too:

```bash
npm run mobile:e2e:test -- home,browse
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

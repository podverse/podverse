# membership-period-policy-date-helpers

## Session 1 - 2026-05-05

#### Prompt (Developer)

@podverse/packages/helpers/src/lib/membershipPeriodPolicy.ts:1-72 I am wondering if you
think there are reusable date helpers that should be used that already exist or would fit in
elsewhere for this file. We generally don't want If there are shared helpers that already meet
the conditions needed. Or if you think these are reusable elsewhere, you can consider moving
them somewhere else although anything that is specific only to memberships does make sense
in this file

#### Prompt (Agent)

Refactor: lift generic date helpers out of membershipPeriodPolicy

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file
itself.

To-do's from the plan have already been created. Do not create them again. Mark them as
in_progress as you work, starting with the first one. Don't stop until you have completed all
the to-dos.

#### Key Decisions

- Lift the genuinely-generic UTC date primitives out of `membershipPeriodPolicy.ts` into the
  shared `date.ts` helpers so they're discoverable for future callers.
- New shared helpers: `addUtcMonthsClamped` (UTC calendar-month add with end-of-month clamp)
  and `laterOfDates` (max of two Date values).
- Keep the membership-domain wrappers (`extendMembershipPeriodByMonths`,
  `extendMembershipPeriodByCadence`, `resolveMembershipExtensionBaseDate`) and the
  membership-flavored guard `assertValidMonthsToExtend` in `membershipPeriodPolicy.ts`.
- Inline the trivial `normalizeDate` (it's just `new Date(value.getTime())`).
- No new dependencies (skipped `@date-fns/tz` route); no caller signatures change.

#### Files Created/Modified

- packages/helpers/src/lib/date.ts
- packages/helpers/src/lib/date.test.ts
- packages/helpers/src/lib/membershipPeriodPolicy.ts
- .llm/history/active/membership-period-policy-date-helpers/membership-period-policy-date-helpers-part-01.md

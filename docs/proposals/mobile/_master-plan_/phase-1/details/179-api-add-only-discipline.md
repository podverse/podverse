# 179-api-add-only-discipline

**Master step:** 22.5
**Model (author + implement):** Auto
**Status:** done

## Scope

Document **API add-only discipline** for mobile DTO compatibility: shipped mobile clients live in the
field for a long time, so API changes must be **backward compatible**.

## Rules

- **Add**, do not remove or repurpose response fields the mobile app reads.
- Do not change field **types** or semantics of existing fields; introduce a new field instead.
- New request params must be optional with safe server defaults.
- Breaking changes require a **min-supported-version** gate (22.4 / 178) and coordinated rollout.
- DTOs come from `@podverse/helpers`; treat their mobile-consumed shapes as a compatibility surface.

## Acceptance criteria

- Add-only rule is explicit for mobile-consumed DTOs, with the min-version escape hatch referenced.

## Verification

- Doc-only; enforced in API review.

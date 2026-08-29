# 584-defer-social

**Master step:** 21.5
**Model (author + implement):** Auto
**Status:** done

## Scope

Record **social features beyond share links** (comments, follows-of-users, feeds of activity,
reactions) as a **v1 deferral**. Mobile v1 supports OS share of public URLs only.

## Rationale

- Social graph features require server-side product design and moderation surface not in scope for
  the mobile MVP.
- Share links already cover the core "send this to a friend" need.

## Revisit trigger

- A social product direction is defined server-side (API + moderation) and prioritized across web +
  mobile together.

## Acceptance

- Deferral captured here, linked from the deferrals appendix (589) + placeholder issue (588).
- Only OS share of public URLs is present in v1.

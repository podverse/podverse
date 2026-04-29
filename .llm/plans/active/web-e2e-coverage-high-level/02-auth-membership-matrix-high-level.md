# 02 — Auth and membership matrix (high-level)

## Goal

Make state-dependent behavior explicit and testable across web pages and CTAs.

## Auth states

1. logged-out
2. logged-in with valid session
3. stale/invalid session cookie (SSR logout path)

## Membership states

1. no membership
2. active trial
3. active paid membership
4. expired trial
5. expired paid membership

## Primary matrix surfaces

- Membership page messaging and CTA differences.
- Checkout entry and pricing-path behavior.
- Protected route access and redirect behavior.
- Account menu/profile route behavior.

## Expected planning outputs for granular next pass

- State x route matrix with concrete assertions.
- Seed personas required for each state row.
- Priority ordering: critical business routes first.

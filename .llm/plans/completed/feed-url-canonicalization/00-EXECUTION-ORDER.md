# Execution order — Feed URL canonicalization across ingestion paths

## Order

1. [01-foundation-url-canonical-helper.md](./01-foundation-url-canonical-helper.md)
2. [02-api-ingress-normalization.md](./02-api-ingress-normalization.md)
3. [03-parser-storage-compatibility.md](./03-parser-storage-compatibility.md)
4. [04-tests-and-rollout.md](./04-tests-and-rollout.md)

## Why this order

- Foundation helper first avoids duplicated URL-fixing logic and keeps behavior consistent.
- API ingress normalization ensures every path accepts feeds that contain raw spaces.
- Parser/storage compatibility prevents runtime fetch failures and DB lookup mismatches.
- Tests and rollout lock in behavior and reduce regression risk.


# COPY-PASTA prompts — Feed URL canonicalization

Use these prompts in order, one at a time.

## Prompt 1 — Foundation helper

Implement [01-foundation-url-canonical-helper.md](./01-foundation-url-canonical-helper.md).
Do not work on later plans yet.

## Prompt 2 — API ingress normalization

Implement [02-api-ingress-normalization.md](./02-api-ingress-normalization.md).
Use canonical URL normalization for all feed URL ingress paths in scope.

## Prompt 3 — Parser and storage compatibility

Implement [03-parser-storage-compatibility.md](./03-parser-storage-compatibility.md).
Keep canonical encoded URL as durable storage format.

## Prompt 4 — Tests and rollout

Implement [04-tests-and-rollout.md](./04-tests-and-rollout.md).
Ensure all feed parsing paths accept raw-space inputs and operate on canonical URLs internally.


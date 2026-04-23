# Phase 08 - Coverage Review and Stop Line

## Intent

Decide if the confidence target is met and stop before low-value complexity.

## Review Checklist

- Are auth/rate-limit critical behaviors covered?
- Are parser/ingestion guardrails covered?
- Are ORM business invariants covered?
- Are value-transfer split/amount invariants covered?
- Are selected web business helpers covered?
- Are new tests fast and deterministic?

## Stop-Line Criteria

Stop adding tests when:

- Additional tests repeat existing signal.
- New tests mostly validate library/framework behavior.
- Setup/mocking complexity outweighs regression protection.

## Final Verification

```bash
./scripts/nix/with-env npm run test
```

## Deliverable Summary

- List added test files.
- List intentional gaps deferred for later.
- Record rationale for stopping point.

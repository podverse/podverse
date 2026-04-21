# Phase 3 - Workers, Parser, and External Integrations Audit

## Confirmed Findings

| Severity | Confidence | Finding | Evidence |
| -------- | ---------- | ------- | -------- |
| Medium | High | SSRF-class surface: parser fetch helpers request arbitrary feed/chapter URLs with no internal-host deny policy. | `packages/parser/src/lib/_request.ts`, `packages/parser/src/lib/rss/parser.ts`, `packages/parser/src/lib/chapters/chapters.ts`. |
| Medium | High | Response-size and memory DoS risk in parser fetch pipeline. | `packages/helpers-requests/src/_request.ts` uses generic axios requests without explicit content-length/body size limits for parser flows. |
| Medium | Medium | CPU/parse DoS risk from unbounded feed payload parsing. | `parseFeed(raw)` usage in `packages/parser/src/lib/rss/parser.ts` and `packages/parser/src/lib/rss/addByRSS.ts`. |
| Low-Medium | Medium | Verbose error logging can include sensitive or attacker-controlled response payloads. | `packages/external-services-podcast-index/src/index.ts` logs error response details. |
| Low | High | Add-by-RSS worker throws include raw message body in error text on malformed payload. | `apps/workers/src/commands/mq/rss/runAddByRSSParser.ts` includes `${bodyStr}` in error. |
| Low | High | Query-string encoding gaps in selected Podcast Index URLs. | `podcastGetByGuid` and `episodeGetByGuid` interpolate raw values into URL query strings. |

## Defensive Controls Verified

- `apps/workers/src/commands/imageShrink/batch.ts` implements stronger fetch guardrails:
  - request timeout
  - max content-length checks
  - max downloaded byte size checks
- MQ consumers generally parse JSON and reject malformed payloads rather than silently processing.
- Parser performs domain-specific rate-delay for wavlake paths to reduce upstream throttling pressure.

## SQLi Relevance For Phase 3

- No SQL injection sink was identified in workers/parser/external-service layers reviewed.
- Primary risk class is network abuse and resource exhaustion, not SQL query manipulation.

## Recommended Follow-Up Hardening Targets

1. Central SSRF guard for parser request helpers:
   - allowlist/denylist
   - private-network and link-local blocking
   - redirect policy
2. Shared response limits in `helpers-requests` for non-browser parser/service usage.
3. Logging redaction expansion for upstream error payloads and raw MQ body paths.

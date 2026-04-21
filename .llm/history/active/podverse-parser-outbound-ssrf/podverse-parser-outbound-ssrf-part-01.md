### Session 1 - 2026-04-21

#### Prompt (Developer)

Read and execute:
/Users/mitcheldowney/repos/pv/podverse/.llm/plans/completed/podverse-security-remediation-wave-1/02-parser-ssrf-and-response-guardrails.md

Implement exactly what the plan specifies, including tests and verification commands.
Do not edit plan markdown files.

#### Key Decisions

- Added `@podverse/helpers-requests` outbound policy (`outboundHttpPolicy.ts`): http(s)-only, no embedded credentials, blocks localhost hostname and **non-unicast IP ranges** via `ipaddr.js` (RFC1918, loopback, link-local including `169.254.169.254`, CGNAT, reserved, etc.). Initial requests resolve hostnames with **async** DNS and validate every resolved address.
- Axios **redirect hooks** validate scheme/credentials and **block bad IP literals** synchronously; hostname redirects cannot use sync DNS on current Node APIs, so those are documented as not re-resolved there (initial URL still validated).
- New `requestForOutbound` / `requestWithUserAgentForOutbound` / headers variants enforce policy, **20 MiB** response cap (`maxContentLength` / `maxBodyLength`), default **5 s** abort timeout, and `beforeRedirect` chaining.
- Parser `_request.ts` now calls **ForOutbound** wrappers only (no bypass at feed/chapter call sites).
- Vitest tests in both packages; parser vitest aliases `@podverse/helpers-requests` to source so tests work before dist rebuild.

#### Files Modified

- packages/helpers-requests/src/outboundHttpPolicy.ts (new)
- packages/helpers-requests/src/outboundHttpPolicy.test.ts (new)
- packages/helpers-requests/src/requestOutbound.test.ts (new)
- packages/helpers-requests/src/\_request.ts
- packages/helpers-requests/src/index.ts
- packages/helpers-requests/package.json
- packages/helpers-requests/tsconfig.json
- packages/helpers-requests/vitest.config.ts (new)
- packages/parser/src/lib/\_request.ts
- packages/parser/src/lib/outboundGuard.test.ts (new)
- packages/parser/package.json
- packages/parser/tsconfig.json
- packages/parser/vitest.config.ts (new)
- package-lock.json

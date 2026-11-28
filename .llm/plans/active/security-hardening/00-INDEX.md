# Security hardening — review index

This file is a review list. Do not execute it. The paste prompts are in
[PROMPTS.md](PROMPTS.md). Every directory named below is in `completed/`.

Two of the original notes are not directories here:

- Repeated failed passwords and a second factor were one note. The lock was dropped and
  [issue 416](https://github.com/podverse/podverse/issues/416) is closed. The second factor
  is [417](../../completed/417-second-factor/).
- "If a model is added later, do not let it fetch or query with the user's session" is
  guidance for that future work. There is no product change to plan until that work exists.

This set is finished. Issues 414 through 423 are closed. The shipped replies are on the
issues. 415, 416, and 422 were closed with no product change.

## Order

Later rows touch files earlier rows may edit. Keep this order.

| Order | Directory | Issue | Ask before code? |
| --- | --- | --- | --- |
| 1 | [419-session-jwt-hs256](../../completed/419-session-jwt-hs256/) | 419 | No |
| 2 | [414-outbound-fetch-policy](../../completed/414-outbound-fetch-policy/) | 414 | No |
| 3 | [423-description-markup-corpus](../../completed/423-description-markup-corpus/) | 423 | No |
| 4 | [421-actions-pin-sha](../../completed/421-actions-pin-sha/) | 421 | No |
| 5 | [420-cookie-write-header](../../completed/420-cookie-write-header/) | 420 | No |
| 6 | [418-api-docs-exposure](../../completed/418-api-docs-exposure/) | 418 | Yes. Public API spec stays anonymous or not. |
| 7 | [415-shared-rate-limits](../../completed/415-shared-rate-limits/) | 415 | Won't do. Issue closed. Counters stay in process memory. |
| 8 | [416-account-login-lock](../../completed/416-account-login-lock/) | 416 | Dropped. Issue closed. No product change. |
| 9 | [422-cluster-egress-policy](../../completed/422-cluster-egress-policy/) | 422 | Dropped. Issue closed. No NetworkPolicy. |
| 10 | [417-second-factor](../../completed/417-second-factor/) | 417 | Shipped. Authenticator app, optional unless the deployment says required. |

## Alpha deploy (k.podcastdj.com)

Each plan has an **Alpha GitOps** section. These need a file or a same-promotion image
bump in `apps/podverse-alpha/` before alpha keeps working. The others do not. No plan
needs a logout migration. Two internal users can sign in again where a plan ends sessions.

| Plan | What alpha needs |
| --- | --- |
| 419 | Nothing. Do not rotate the JWT secret. |
| 414, 423, 421, 418 | Nothing beyond the normal image and `?ref=` bump. |
| 420 | Bump api, management-api, web, and management-web together. No new env key. |
| 415 | Nothing. This change is not shipping. |
| 417 | Mode `optional` on the API and management API. Encryption keys in the existing opaque secrets, not in git. Management email codes use the existing mailer secret. Ship the API and web images together. Existing sessions stay until they end. |


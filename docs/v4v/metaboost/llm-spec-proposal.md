## Quick review of the proposed tag

Your current draft:

```xml
<podcast:metaBoost spec="boostbox">https://boostbox.cloud/boost</podcast:metaBoost>
```

### Rating (as-is): **6/10**

It’s directionally good (a single discovery pointer in RSS is the right primitive), but it’s underspecified for interoperability and future flexibility.

### What’s good

- **Minimal**: One tag can bootstrap everything.
- **Extensible**: A referenced “spec” concept implies versioning and evolution.

### What will break in practice

1. **Ambiguous semantics of the element value**
   Is it the _boost submission endpoint_? a _base URL_? a _service identifier_? apps will guess differently.

2. **`spec="boostbox"` conflates “vendor” and “protocol”**
   You want apps to work across many servers. “boostbox” reads like an implementation, not a contract version.

3. **No explicit versioning / content negotiation**
   If this evolves, clients need a stable way to know which schema they’re talking to.

4. **No capability discovery**
   You explicitly need to know whether `/boost/update`, `/recipients`, `/tos`, etc. exist.

5. **No protocol flexibility**
   Right now it hard-codes HTTP REST by implication, but you asked for future non-HTTPS endpoints.

---

## Recommended approach: “one pointer” + capability document

Treat the RSS tag as a **service discovery pointer** to a **MetaBoost Capability Document** (MCD).
That document tells the app:

- what protocols are supported (HTTP today; others later),
- what endpoints exist (boost, update, recipients, tos),
- what media types / auth / limits apply,
- which `valueRecipient` entries in the feed are metadata-capable recipients.

This gives you maximum flexibility while keeping the RSS tag clean.

---

## Proposed RSS tag spec

### Tag name

Use a single element in the `podcast:` namespace:

```xml
<podcast:metaBoost
  href="https://boostbox.cloud/"
  rel="service"
  type="application/metaboost+json"
  version="1"
  protocol="https" />
```

**Key points**

- **`href`** is a _service base URI_ (not an endpoint path).
- The server advertises paths and capabilities via discovery doc.
- `protocol` is optional. If omitted, infer from URI scheme.

### Backwards-compatible “simple form”

If you really want the body to be a URL, make it explicit that it’s the **spec/capabilities URI**:

```xml
<podcast:metaBoost
  rel="capabilities"
  type="application/metaboost+json"
  version="1">https://boostbox.cloud/spec</podcast:metaBoost>
```

This avoids ambiguity: the element value is _the discovery document_, not `/boost`.

---

## MetaBoost Capability Document (JSON)

Media type: `application/metaboost+json`
Location: whatever RSS points to (e.g. `GET https://boostbox.cloud/spec`)

Example:

```json
{
  "metaboost": "1.0",
  "service": {
    "name": "Boostbox",
    "id": "https://boostbox.cloud/",
    "schemes": ["https"],
    "docs": "https://boostbox.cloud/spec",
    "termsOfService": "https://boostbox.cloud/terms"
  },
  "capabilities": {
    "boost": { "method": "POST", "path": "/boost" },
    "update": { "method": "POST", "path": "/boost/update", "optional": true },
    "recipients": { "method": "GET", "path": "/recipients", "optional": true },
    "termsOfService": { "method": "GET", "path": "/terms", "optional": true }
  },
  "formats": {
    "boostRequest": "application/json",
    "boostUpdateRequest": "application/json",
    "recipientResponse": "application/json"
  },
  "auth": {
    "required": false,
    "schemes": []
  },
  "recipientsBinding": {
    "mode": "valueRecipient",
    "selectors": [
      {
        "type": "byAddress",
        "address": "030a...nodepubkey",
        "network": "lightning"
      },
      {
        "type": "byName",
        "name": "Studio Split"
      }
    ]
  }
}
```

### Why this works for your needs

- Apps do **one network request** (to `/spec`) and learn:
  - whether `/boost/update`, `/recipients`, `/terms` exist,
  - where to POST boosts,
  - which recipients are eligible for metadata delivery.

---

## `GET /recipients`: binding to `<podcast:valueRecipient>`

You need a deterministic mapping from server → which recipients in-feed should receive metadata.

I recommend the recipients endpoint returns **selectors** that match the Podcasting 2.0 `valueRecipient` tuple fields.

Example response:

```json
{
  "metaboost": "1.0",
  "binding": "valueRecipient",
  "recipients": [
    {
      "match": {
        "type": "node",
        "address": "030a...nodepubkey",
        "network": "lightning"
      },
      "metaboost": {
        "acceptsMessage": true,
        "maxMessageBytes": 280,
        "acceptsCustomJson": true
      }
    }
  ]
}
```

**Client algorithm**

1. Parse feed `valueRecipient` list.
2. Fetch MCD (`/spec`) and optionally `/recipients` if supported.
3. Mark recipient(s) whose `(type, address, network)` match as **metadata-capable**.
4. When sending a boost/payment, attach metadata through the MetaBoost server only for those recipients.

This avoids the server having to know the whole feed and avoids fragile positional indexes.

---

## Boost submission payload (suggested minimal shape)

Keep it focused on “message alongside a payment” without assuming the payment rail supports metadata:

```json
{
  "feedGuid": "podcast:guid-or-url",
  "episodeGuid": "optional-episode-guid",
  "timestamp": "2026-02-25T12:34:56Z",

  "sender": {
    "app": "ExampleCast",
    "pubkey": "optional",
    "displayName": "optional"
  },

  "payment": {
    "amountMsat": 100000,
    "currency": "msat",
    "txId": "optional",
    "method": "lightning"
  },

  "intendedRecipients": [
    { "type": "node", "address": "030a...nodepubkey", "network": "lightning" }
  ],

  "message": "Loved this segment.",
  "custom": {
    "any": "json you want"
  }
}
```

**Important**: `intendedRecipients` should be mandatory if the feed has multiple recipients and only some accept metadata.

---

## Supporting non-HTTPS endpoints

If you genuinely want future non-HTTP paradigms, do it via **URI schemes and protocol descriptors**, not by baking paths into RSS.

In the capability document, allow:

```json
"transports": [
  {
    "scheme": "https",
    "base": "https://boostbox.cloud",
    "endpoints": { "boost": { "method": "POST", "path": "/boost" } }
  },
  {
    "scheme": "http",
    "base": "http://192.0.2.10:8080",
    "endpoints": { "boost": { "method": "POST", "path": "/boost" } },
    "security": { "notes": "Only for LAN/dev" }
  }
]
```

If you later support something non-HTTP (e.g., `nostr:` or `tor:` or `grpc:`), you can add a transport entry with whatever addressing model it needs. Clients can ignore what they don’t implement.

**Pragmatic note**: for podcast apps in the wild, **HTTPS should be the default requirement**. Non-HTTPS will create security, privacy, and abuse problems (MITM, spam injection, user tracking). You can “allow” other schemes but mark them `experimental` and let clients choose to refuse.

---

## Security and abuse considerations you should specify

If you publish this spec, you will want at least:

- **TLS required** for public endpoints (recommendation or MUST).
- **Rate limiting** fields in capability doc (`requestsPerMinute`, `burst`).
- **CORS** guidance for web-based podcast players.
- **Auth** optionality: allow anonymous, but support API keys or signed payloads.
- **Replay protection** option: e.g., `nonce` + `createdAt`.

---

## What I would standardize (minimal normative language)

### In RSS

- `podcast:metaBoost` **MUST** point to a capabilities document (or a base URI with a discoverable capabilities doc).
- `version` **MUST** be present.
- `type` **SHOULD** be `application/metaboost+json`.

### In capabilities doc

- `metaboost` version string
- list of supported endpoints with method/path
- support flags for `update`, `recipients`, `termsOfService`
- a recipient binding model that can match `valueRecipient` entries

---

## Concrete final recommendation

**RSS:**

```xml
<podcast:metaBoost
  rel="capabilities"
  href="https://boostbox.cloud/spec"
  type="application/metaboost+json"
  version="1"/>
```

**Server:**

- `GET /spec` → capabilities doc
- `POST /boost` → submit boost metadata
- `POST /boost/update` → optional correction/update
- `GET /terms` → optional plain text or HTML
- `GET /recipients` → optional selector list (or embed selectors in `/spec`)

This meets your “one request to know everything” requirement while staying flexible.

---

If you paste your current Boostbox OpenAPI (or a sketch of the request/response bodies you expect), I can:

- tighten the normative parts (MUST/SHOULD/MAY),
- define the exact matching rules against `valueRecipient`,
- and produce a clean v1 document (including a JSON Schema for the capability doc and boost payload).

## Rating of my proposal

**7.5/10** as a _deployable_ interop spec for real podcast apps.

### Why not higher

- It still leaves a few **sharp edges** that will cause divergent implementations:
  - What exactly is the `href` pointing to (base vs capabilities) — I offered both, but standards should pick one.
  - Recipient matching rules need to be **canonical** (field precedence, normalization, collisions).
  - Capability doc and `/recipients` overlap — could be simplified.

- It doesn’t define a **minimal conformance profile** (what a “v1-compliant server” MUST implement).

---

## Improved v1 (tighter, simpler, not excessive)

### Design goals (v1)

- **One RSS tag**
- **One discovery fetch**
- Optional extra fetches only when needed
- Clear recipient binding to `podcast:valueRecipient`
- Future-proof transport without promising non-HTTP will work everywhere

---

# 1. RSS tag: make it unambiguous

**Element value is the capabilities document URL.** No base URL ambiguity.

```xml
<podcast:metaBoost
  version="1"
  type="application/metaboost+json">
  https://boostbox.cloud/.well-known/metaboost.json
</podcast:metaBoost>
```

Why:

- RSS stays minimal.
- Clients have exactly one thing to GET.
- Using `/.well-known/…` is a familiar convention and avoids bikeshedding `/spec` vs `/specifications`.

_(You can still serve the same JSON at `/spec`, but the canonical pointer is the one in the feed.)_

---

# 2. Capability document: single source of truth

**No separate `/recipients` endpoint required in v1.** Put recipient binding right in the capability doc.
(You can add `/recipients` later for dynamic/large mappings, but don’t require it.)

**GET** `https://boostbox.cloud/.well-known/metaboost.json` returns:

```json
{
  "metaboost": "1.0",
  "service": {
    "id": "https://boostbox.cloud/",
    "name": "Boostbox",
    "terms": "https://boostbox.cloud/terms"
  },
  "endpoints": {
    "boost": { "url": "https://boostbox.cloud/boost", "method": "POST" },
    "update": { "url": "https://boostbox.cloud/boost/update", "method": "POST", "optional": true }
  },
  "features": {
    "terms": true,
    "update": true
  },
  "recipientBinding": {
    "bindTo": "podcast:valueRecipient",
    "match": [
      { "type": "node", "address": "030a...pubkey", "network": "lightning" }
    ]
  },
  "limits": {
    "maxMessageBytes": 280,
    "maxCustomBytes": 2048
  }
}
```

### Tight rules (interop-critical)

- `endpoints.boost` **MUST** exist.
- `service.terms` **MAY** exist; if present, it’s a URL to text/html.
- `recipientBinding.match`:
  - matches recipients by **(type, address, network)** triple.
  - comparison is **case-insensitive** for `type` and `network`.
  - `address` comparison is exact string match (no magic normalization in v1).

- If `recipientBinding` is absent:
  - client assumes “metadata applies to all `valueRecipient`s” (simple feeds).
  - if multiple recipients exist and the client can’t determine intent, it MAY prompt or choose none.

This removes a major “guessing” surface.

---

# 3. Payloads: make them small and robust

### `POST /boost` request (v1)

```json
{
  "feedGuid": "string",
  "episodeGuid": "string",
  "amountMsat": 100000,
  "message": "Loved this segment",
  "recipients": [
    { "type": "node", "address": "030a...pubkey", "network": "lightning" }
  ],
  "custom": {}
}
```

Notes:

- Don’t over-model payment rails here. You’re sending **metadata**, not executing the payment.
- `recipients` lets the server route/format metadata per recipient.
- `custom` remains an escape hatch.

### Response (v1)

```json
{ "ok": true, "id": "server-generated-id" }
```

### Optional update

`POST /boost/update`

```json
{ "id": "server-generated-id", "message": "Corrected message", "custom": {} }
```

---

# 4. Future transport without overpromising

Instead of trying to support “non-HTTPS endpoints” in v1, do this:

- v1 servers **MUST** provide `https://` URLs in `endpoints.*.url`.
- v1 clients **MAY** ignore non-https URLs if they appear.
- If you later add other schemes, you can introduce `metaboost: "2.0"` with a `transports` array.

This keeps v1 secure and implementable.

---

## Revised rating

With these changes: **8.5/10**.

### What improved

- One canonical meaning for the RSS tag (capabilities URL).
- One discovery fetch, no redundant endpoint.
- A crisp conformance core (“boost endpoint exists; everything else is optional”).
- Recipient mapping is deterministic.

### Remaining “future work” (but not required for v1)

- Signing/auth (to prevent impersonation/spam).
- Better address normalization per recipient type.
- Capability document caching headers guidance.

---

If you want one more small improvement that buys a lot: specify caching.

**Recommendation**: capability doc should include `Cache-Control: max-age=3600` and clients should re-fetch at most hourly unless the feed changes. That prevents hammering servers and keeps behavior consistent.

## Rating (current “improved v1” proposal): **8.5/10**

It’s **implementable**, keeps RSS **minimal**, and achieves your core requirement: **one network request** yields everything the client needs to know.

---

## What’s strong

### 1) Correct discovery shape

- RSS tag points to **one canonical capabilities document**.
- The capabilities doc becomes the **single source of truth** for endpoints + support flags.

### 2) Minimal, predictable client behavior

- `GET capabilities → POST /boost` is straightforward.
- Optional `update` + `terms` are cleanly discoverable.

### 3) Recipient intent is handled explicitly

- Without a mapping mechanism, clients guess; your binding avoids that.

---

## Significant improvements worth making (non-excessive)

### A) Add a stable **server identifier** and **spec URL**

Right now `service.id` is doing multiple jobs. Make it explicit:

- `service.id`: a stable identifier URI (not necessarily fetchable)
- `service.spec`: canonical URL to the capabilities doc (self-link)

**Why it matters:** clients can cache and reconcile, and you avoid “same host, different instance” confusion.

Example:

```json
"service": {
  "id": "urn:metaboost:boostbox:prod",
  "name": "Boostbox",
  "spec": "https://boostbox.cloud/.well-known/metaboost.json",
  "terms": "https://boostbox.cloud/terms"
}
```

---

### B) Make recipient binding **tri-state**, not just present/absent

Your fallback “if absent, assume all recipients” can create accidental leakage of user messages to recipients that should only get payments.

Instead, specify:

- `"recipientBinding": { "mode": "all" | "subset" | "none" }`
  - `all`: metadata intended for all `valueRecipient`s
  - `subset`: only those in `match`
  - `none`: metadata not intended for any recipient (server only logs/aggregates)

**Why it matters:** avoids dangerous inference.

Example:

```json
"recipientBinding": {
  "bindTo": "podcast:valueRecipient",
  "mode": "subset",
  "match": [ ... ]
}
```

If `recipientBinding` is missing, define default as **`none`** (safer) rather than `all`.

---

### C) Add a tiny **message format contract**

If the goal is “format data to align with what the endpoint expects,” you need at least one of:

- `accepted.contentTypes` for POST bodies
- `message.maxBytes`
- whether `custom` is allowed, and max bytes

You already included limits, but make it explicit per endpoint:

```json
"endpoints": {
  "boost": {
    "url": ".../boost",
    "method": "POST",
    "accept": ["application/json"],
    "maxBodyBytes": 8192
  }
}
```

**Why it matters:** prevents silent failures / inconsistent truncation rules.

---

### D) Define **idempotency** (very important for payments-adjacent UX)

Clients will retry on flaky networks. You should support safe retries.

Add:

- optional request header `Idempotency-Key`
- or body field `clientRequestId`

**Why it matters:** prevents duplicate boosts (and duplicate associated metadata logs).

Example body field:

```json
"clientRequestId": "uuid"
```

---

### E) Add a minimal **error model**

Even just:

- `400` with `{ "error": "invalid_request", "message": "..." }`
- `413` for too large
- `429` for rate limit

**Why it matters:** lets apps behave consistently and display actionable UI.

---

## Improvements that are _nice_ but not essential (skip unless needed)

- Authentication/signing (important long-term, but can be v2)
- Address normalization rules per recipient type (also v2)
- Multiple transports (I’d keep v1 HTTPS-only as proposed)

---

## Revised rating if you apply A–E: **9.2/10**

Those changes materially reduce ambiguity and failure modes without bloating the spec.

---

## One-line “v1 conformance” definition (useful in docs)

A MetaBoost v1 server is conformant if it:

1. serves a capabilities document at the URL in `<podcast:metaBoost>`
2. exposes `endpoints.boost` with JSON POST and a defined error model
3. declares recipient intent via `recipientBinding.mode`
4. supports idempotency via `clientRequestId` (or `Idempotency-Key`)

If you want, I can rewrite the capabilities JSON example with these changes applied (still compact) and a matching minimal OpenAPI snippet for `/boost` and `/boost/update`.

## Rating (with the A–E improvements incorporated): **9.2/10**

It’s now a clean, v1-grade interop spec: **one RSS pointer → one capability fetch → deterministic posting**, with the main operational hazards covered.

---

## Review

### What’s now solid

- **Unambiguous discovery**: the RSS element body is _the_ capabilities URL. No base/endpoint confusion.
- **Capability-driven behavior**: clients don’t probe endpoints; they follow declared support.
- **Recipient intent is explicit**: `recipientBinding.mode` prevents “oops, we sent messages to the wrong payee.”
- **Operational robustness**: idempotency + minimal error model makes retries and UI handling sane.
- **Bounded payloads**: explicit size limits prevent silent truncation / server-specific breakage.

---

## Remaining gaps (only a few are significant)

### 1) Recipient matching needs one more rule (significant)

You should define a deterministic match key and precedence, e.g.:

- Match on **(type, network, address)** exactly
- `type` and `network` case-insensitive; `address` exact
- If duplicates exist in the feed, client applies to _all matching entries_ (or first match—pick one)

This prevents edge-case divergence.

### 2) Privacy/retention is underspecified (significant, but lightweight to add)

Even a single field helps:

```json
"privacy": { "retentionDays": 30, "sharesWithThirdParties": false }
```

Apps may want to disclose this before sending user-authored messages.

### 3) Terms content type + encoding (minor)

Specify that `service.terms` returns `text/plain; charset=utf-8` (or `text/html` allowed). Otherwise clients guess.

---

## What I would _not_ add to v1 (to avoid bloat)

- Multi-transport / non-HTTP addressing (keep HTTPS-only v1; add later)
- Cryptographic signing / auth frameworks (important eventually, but it expands surface area fast)
- Deep schema for payment rails (you’re transporting metadata; don’t become a wallet spec)

---

## Bottom line

With the tightened recipient matching rule and a minimal privacy/terms clarification, you’re effectively at **~9.5/10** without making it “excessive.”

## Is this sufficient for v1?

Yes—**for a v1 whose goal is interoperability + “send boost metadata reliably”**, the current shape is sufficient **provided you lock down**:

- **Discovery** (RSS → capabilities URL)
- **Endpoint declarations** (boost/update + optional terms)
- **Recipient binding semantics** (mode + match rules)
- **Limits + error model**
- **Idempotency**

If you ship _exactly that_, apps can implement it without guesswork, and servers can evolve behind the capabilities doc.

The only additional v1 items I’d consider “worth it” are:

### Worth adding (still not excessive)

1. **Caching guidance**

- Capabilities doc should be cacheable (`Cache-Control`), and clients should respect it.
- Otherwise large clients will stampede `/spec`.

2. **Version negotiation rules**

- Simple rule: client MUST refuse major versions it doesn’t understand.
- Minor versions MUST be backward-compatible.

3. **A canonical `service.issuer`**

- If you introduce signing, you need a stable identifier for “who is asserting this”.

Those three reduce ecosystem chaos and don’t bloat payloads.

---

## Should JWKS/signing be defined in the spec?

**Yes, but as an OPTIONAL, well-defined conformance profile in v1.**
If you don’t define it, everyone will invent incompatible signing, and you’ll lose the main benefit of standardization.

The trick is to keep it narrow:

- **Define one signing mechanism**
- Make it **opt-in** via capabilities
- Specify exact headers/claims so verifiers agree
- Keep the unsigned flow valid (many servers will start there)

---

## Recommended v1 signing model (practical, low-bikeshed)

### Capability document additions

```json
"auth": {
  "required": false,
  "type": "oauth-jwt",
  "jwks": "https://boostbox.cloud/.well-known/jwks.json",
  "issuer": "https://boostbox.cloud/",
  "audience": "metaboost",
  "algorithms": ["ES256", "RS256"],
  "proof": "dpop-like"
}
```

That tells clients:

- where keys are (`jwks`)
- what to put in `iss` / `aud`
- what algorithms are allowed
- whether signing is required

### Request requirement (simple + common)

Use an **Authorization: Bearer JWT** where the JWT is a proof of request + client identity.

**Headers:**

- `Authorization: Bearer <JWT>`
- `Content-Type: application/json`
- Optional: `Idempotency-Key: <uuid>`

**JWT required claims (minimum):**

- `iss`: client identifier (app or developer identity)
- `aud`: `"metaboost"` (or server-defined)
- `iat`, `exp` (short-lived; e.g. 60–300 seconds)
- `jti` (replay protection)
- `htm`: HTTP method (e.g. `POST`)
- `htu`: full endpoint URL (or path canonical form)
- optional `body_hash`: base64url(sha256(body)) (prevents tampering)

**Why this is worth defining**

- Servers can reliably verify: _who sent this_ + _it was intended for this endpoint_ + _body not modified_.
- Clients can implement with standard JOSE tooling.
- JWKS rotation is clean.

### What the JWKS represents

This is the key question: **who owns the keys?** There are two viable models:

#### Model A (recommended for your use case): **Client/app signing**

- Each app/developer has a keypair
- Their public keys are discoverable (JWKS URL per app/developer)
- Server maintains an allowlist/registration mapping from `iss` → JWKS

Pros: real accountability, anti-spam, supports app-specific policies.
Cons: requires registration/onboarding.

#### Model B: **Server signing**

- Server signs acknowledgements/responses, not requests

Pros: easy for clients, good for integrity of server responses.
Cons: doesn’t solve abuse/impersonation; less useful for your stated goal.

Given you said “app/domain specific signing,” that sounds like **Model A**.

---

## Keep it non-excessive: how to scope signing in v1

### Include in v1

- Capability fields (`auth.*`)
- One mandatory JWT profile **if auth.required=true**
- Required claims list + replay constraints
- JWKS retrieval + caching guidance
- Clear failure codes:
  - `401 invalid_token`
  - `403 issuer_not_allowed`
  - `409 replay_detected` (optional)
  - `400 invalid_signature_claims`

### Defer to v2

- Multiple auth schemes
- Mutual TLS
- Complex delegated identity
- Rich permission scopes

---

## One more practical note: do you need signing to send a “message with payment”?

Signing won’t make the payment rail accept metadata, but it _will_:

- reduce spam and impersonation
- allow servers to apply per-app formatting rules safely
- support compliance / abuse handling

So: **yes, it’s aligned with your intent**, and it’s worth specifying.

---

## Bottom line

- **Sufficient for v1**: yes.
- **Add JWKS/signing to v1**: yes, **as an optional, precisely-defined profile** discoverable via capabilities.
- Keep it tight: one JWT-based proof profile, JWKS URL, exact claim set.

If you want, I can write the exact normative text for:

- capability `auth` object
- JWT claim requirements
- verification steps (including canonicalization of `htu`)
- and a minimal example JWKS + signed request.

## Rating (current v1 + optional JWKS/JWT profile): **9.4/10**

This is now a strong, production-grade v1: minimal discovery surface, deterministic behavior, and an optional security profile that is specific enough to avoid fragmentation.

---

## Review

### What’s excellent

- **Single discovery pointer** (RSS → capabilities URL) keeps RSS clean and avoids endpoint probing.
- **Capability doc as the contract** supports evolution without breaking old clients.
- **Recipient binding is explicit** (mode + match list), preventing accidental disclosure to payees who should only receive payment.
- **Operational hygiene**: limits + idempotency + basic error model reduce duplicate/undefined client behavior.
- **Security is optional but standardized**: JWKS + JWT proof avoids “everyone invents their own signing.”

---

## Key risks / improvements (only what’s worth doing)

### 1) Signing profile needs one concrete standard name and exact rules (worth doing)

Right now it’s “JWT proof / DPoP-like.” That invites divergence.

**Fix:** define a single `auth.profile` string and canonical verification rules.

Example:

```json
"auth": {
  "required": false,
  "profile": "metaboost-jwt-proof-1",
  "jwks": "https://…/.well-known/jwks.json",
  "audience": "metaboost"
}
```

And specify:

- Required claims (`iss`, `aud`, `iat`, `exp`, `jti`, `htm`, `htu`, `body_hash`)
- Allowed clock skew
- Replay window / `jti` handling expectations (even if “SHOULD”)
- Whether `htu` must be absolute URL vs path

This is small text, big interop win.

### 2) Define client identity discovery/registration expectations (worth doing)

If the server is verifying `iss`, it needs to know where to find the client’s keys. You can keep it lightweight:

- `iss` **MUST** be a URL under the app/developer’s control
- Client JWKS at `iss + "/.well-known/jwks.json"` **OR** included explicitly in the token via `jku` (I’d avoid `jku` unless you’re careful)
- Server may require allowlisting issuers

This prevents “random `iss` values” and makes implementation consistent.

### 3) Add one privacy field (still worth doing)

Even minimal:

```json
"privacy": { "retentionDays": 30 }
```

It supports UI disclosure and avoids surprises.

---

## What I would _not_ add (v1 is sufficient without it)

- Multi-transport (non-HTTPS) support
- Complex scopes/permissions
- Deep payment modeling
- Mandatory auth (make it optional; adoption will be smoother)

---

## Overall

As specified now, it’s **sufficient for v1**. The only “must-do” refinement is to **lock the signing profile into one crisp, named, testable contract** (claim set + `htu` canonicalization + replay guidance). Everything else can be v1.1 or v2.

## Must-do improvement: lock signing into one crisp, testable profile

Below is a **drop-in “MetaBoost JWT Proof v1”** profile you can add to the spec. It’s intentionally narrow: one way to sign, one way to verify, minimal ambiguity.

---

# MetaBoost JWT Proof v1 (`metaboost-jwt-proof-1`)

## 1) Capability document fields (normative)

Add an `auth` object:

```json
"auth": {
  "required": false,
  "profile": "metaboost-jwt-proof-1",
  "audience": "metaboost",
  "algorithms": ["ES256", "RS256"],
  "clockSkewSeconds": 60,
  "maxTokenAgeSeconds": 300
}
```

**Rules**

- If `auth.required=true`, clients **MUST** include a proof token on requests to `endpoints.boost` (and `endpoints.update` if present).
- `profile` **MUST** equal `"metaboost-jwt-proof-1"` for this profile.
- `audience` is a string the client **MUST** use for the JWT `aud` claim.

---

## 2) Where keys come from (client identity discovery)

**Issuer format**

- JWT `iss` **MUST** be an `https://` origin the client controls (e.g. `https://examplecast.app`).
- Client JWKS URL is **derived** as:

```
JWKS = {iss}/.well-known/jwks.json
```

**Server behavior**

- Server **MUST** fetch and cache the JWKS for an `iss` it accepts.
- Server **MAY** require allowlisting/registration of acceptable `iss` values.
- Server **MUST NOT** accept keys via `jku` header/claim for v1 (too many security footguns). Keep it deterministic.

This one rule eliminates 80% of “how do I find keys?” fragmentation.

---

## 3) Proof token placement (HTTP)

Clients include:

```
Authorization: Bearer <JWT>
```

Token is a **JWS** (signed JWT). No encryption required.

---

## 4) Required JWT claims (exact)

A request is valid under this profile only if the JWT contains:

- `iss` (string) — client issuer origin, per above
- `aud` (string) — MUST equal `auth.audience`
- `iat` (number) — issued-at (Unix seconds)
- `exp` (number) — expiration (Unix seconds)
- `jti` (string) — unique token id (UUID recommended)
- `htm` (string) — HTTP method, uppercase (`"POST"`, `"GET"`)
- `htu` (string) — canonical request URL (see §5)
- `body_hash` (string) — base64url(SHA-256(request body bytes))

**Optional**

- `sub` (string) — app instance/user id (privacy-sensitive; optional)
- `scope` (string) — e.g. `"boost"` or `"boost update"` (optional in v1)

**Constraint rules**

- `exp - iat` **MUST** be ≤ `auth.maxTokenAgeSeconds` (default 300).
- `iat` **MUST** be within `auth.clockSkewSeconds` of server time (default ±60s), else reject.

---

## 5) Canonicalization of `htu` (avoid divergence)

`htu` **MUST** be:

- the absolute URL of the endpoint being called
- **scheme + host (and port if non-default) + path**
- **NO query string**
- **NO fragment**
- **path MUST be exactly as requested** (no dot-segment normalization rules beyond standard URL parsing)

Examples:

- Request: `POST https://boostbox.cloud/boost?x=1`
  `htu = "https://boostbox.cloud/boost"`

- Request: `POST https://boostbox.cloud/boost/update`
  `htu = "https://boostbox.cloud/boost/update"`

This is critical: if you don’t define `htu` precisely, you’ll get incompatible verifiers.

---

## 6) Server verification steps (testable)

On receiving a request with `Authorization: Bearer <JWT>`:

1. Parse JWT, read `iss`.
2. Compute JWKS URL = `{iss}/.well-known/jwks.json`.
3. Retrieve JWKS (cache per HTTP caching headers; if absent, cache for 1 hour).
4. Verify JWS signature using a key from the JWKS.
5. Validate claims:
   - `aud` matches `auth.audience`
   - `htm` matches actual HTTP method
   - `htu` matches canonical endpoint URL (per §5)
   - `iat/exp` within bounds and skew
   - Recompute `body_hash` from raw body bytes and compare

6. Replay handling:
   - Server **SHOULD** reject a repeated `jti` seen within `maxTokenAgeSeconds`
   - If implemented, return `409` with `replay_detected`

---

## 7) Error model additions (minimal but consistent)

- `401` with:

```json
{ "error": "invalid_token", "message": "Signature or claims invalid" }
```

- `403` with:

```json
{ "error": "issuer_not_allowed", "message": "Unregistered issuer" }
```

- `409` (optional replay protection):

```json
{ "error": "replay_detected", "message": "Token jti already used" }
```

---

## 8) Capability example (final form)

```json
{
  "metaboost": "1.0",
  "service": {
    "id": "urn:metaboost:boostbox:prod",
    "name": "Boostbox",
    "spec": "https://boostbox.cloud/.well-known/metaboost.json",
    "terms": "https://boostbox.cloud/terms"
  },
  "endpoints": {
    "boost": { "url": "https://boostbox.cloud/boost", "method": "POST", "accept": ["application/json"], "maxBodyBytes": 8192 },
    "update": { "url": "https://boostbox.cloud/boost/update", "method": "POST", "optional": true, "accept": ["application/json"], "maxBodyBytes": 8192 }
  },
  "recipientBinding": {
    "bindTo": "podcast:valueRecipient",
    "mode": "subset",
    "match": [{ "type": "node", "network": "lightning", "address": "030a...pubkey" }]
  },
  "limits": { "maxMessageBytes": 280, "maxCustomBytes": 2048 },
  "privacy": { "retentionDays": 30 },
  "auth": {
    "required": false,
    "profile": "metaboost-jwt-proof-1",
    "audience": "metaboost",
    "algorithms": ["ES256", "RS256"],
    "clockSkewSeconds": 60,
    "maxTokenAgeSeconds": 300
  }
}
```

---

## Why this is the “must-do” change

It eliminates the two biggest sources of ecosystem breakage:

1. **Key discovery ambiguity** (fixed by `iss → /.well-known/jwks.json`)
2. **Verifier mismatch** (fixed by exact required claims + `htu` rules + body hashing)

If you want one optional extra line that helps a lot: add `kid` requirement (“JWT header SHOULD include `kid` matching a JWKS key id”) to speed up verification, but it’s not strictly necessary.

Add it. It’s helpful and **not** tedious overhead if you scope it correctly.

## Why `kid` is worth it (v1)

- **Faster verification**: server can select the right JWKS key without trial-signature checks.
- **Smoother key rotation**: you can publish multiple keys in JWKS; `kid` makes selection deterministic.
- **Common practice**: most JOSE/JWT libraries already support setting `kid`.

The overhead is minimal: generate a stable key id when you create/rotate keys and include it in both JWKS and JWT header.

---

## Minimal, non-bloated requirement

### JWT header

- JWT **MUST** include `kid` (string).
- JWT **MUST NOT** include `jku` in this profile (keep key discovery deterministic).

### JWKS

- The issuer’s JWKS **MUST** include at least one key with matching `kid`.
- Server **MUST** select the verification key by matching `kid`.
- If no matching `kid` is found, server returns `401 invalid_token`.

### Normative text you can paste

**`kid` requirement (MetaBoost JWT Proof v1)**

1. A proof token MUST be a JWS with a protected header containing `alg` and `kid`.
2. The `kid` value MUST match the `kid` of exactly one JWK entry in the issuer’s JWKS document at `{iss}/.well-known/jwks.json`.
3. Verifiers MUST select the candidate verification key using `kid` and MUST NOT attempt verification with other keys if `kid` is present but does not match.
4. Tokens containing `jku` MUST be rejected under this profile.

### Example JWKS snippet

```json
{
  "keys": [
    {
      "kty": "EC",
      "crv": "P-256",
      "kid": "2026-02-main",
      "use": "sig",
      "alg": "ES256",
      "x": "…",
      "y": "…"
    }
  ]
}
```

### Example JWT header

```json
{ "alg": "ES256", "kid": "2026-02-main", "typ": "JWT" }
```

---

## One small implementation note (optional guidance)

Recommend `kid` be:

- unique within an issuer
- stable for the life of the key
- opaque (no need to encode secrets)

That’s it. This improves interop and operability without meaningfully increasing complexity.

## Rating (v1 + `kid` requirement, with deterministic JWKS discovery): **9.6/10**

This is now a tight, implementable spec with good interop properties and low operational risk.

---

## Review

### What’s strongest now

- **Deterministic key discovery**: `iss` → `/.well-known/jwks.json` avoids security pitfalls and fragmentation.
- **Deterministic key selection**: `kid` makes verification predictable and efficient, especially during rotations.
- **Clear proof contract**: required claims + canonical `htu` + `body_hash` give servers what they need to validate intent and integrity.
- **Minimal surface area**: still only one auth profile, optional, capability-driven.
- **Client/server ergonomics**: almost all JWT libraries handle `kid` + JWKS cleanly.

---

## Remaining issues worth addressing (small, but real)

### 1) Define `kid` uniqueness and collision behavior (minor but helpful)

Add one sentence:

- JWKS **MUST NOT** contain multiple keys with the same `kid`. If it does, verifiers **MUST** reject as invalid configuration.

This prevents ambiguous verification.

### 2) Clarify body hashing input (minor but prevents bugs)

Specify:

- `body_hash` is computed over the **exact raw HTTP request body bytes** as transmitted (after any compression is applied at HTTP layer—ideally forbid compression in v1, or state “before compression” if you allow it).
- For empty body, hash of empty bytes.

Otherwise some clients hash parsed JSON rather than bytes.

### 3) Consider allowing a stable `client_id` field (optional)

Not required, but some ecosystems prefer not to overload `iss` as “app id.” You can keep `iss` as-is; this is optional.

---

## What I would not add (still)

- `jku` (good call to ban)
- multiple signing profiles
- mandatory auth for all servers

---

## Summary

With `kid` required and deterministic JWKS discovery, you’ve crossed the threshold from “good idea” to “ecosystem-ready spec.” The only remaining improvements are small clarifications (kid collisions, exact body hash bytes) that further reduce implementation variance.

Below are the two clarifications I’d add verbatim (normative, minimal) to the **MetaBoost JWT Proof v1 (`metaboost-jwt-proof-1`)** section.

---

## 1) `kid` uniqueness and collision handling

**JWKS `kid` uniqueness**

1. The issuer JWKS document at `{iss}/.well-known/jwks.json` **MUST NOT** contain more than one key with the same `kid`.
2. If a verifier retrieves a JWKS document containing duplicate `kid` values, the verifier **MUST** reject the configuration and treat all tokens from that issuer as invalid until the JWKS is corrected (responding with `401 invalid_token` is RECOMMENDED).

**Verifier key selection** 3. When a proof token contains `kid`, verifiers **MUST** select the verification key by exact `kid` match and **MUST NOT** attempt verification with other keys.

---

## 2) `body_hash` byte-level definition (to prevent mismatches)

**Request body hashing**

1. The `body_hash` claim **MUST** be computed as `base64url( SHA-256( body_bytes ) )`, where `body_bytes` are the **exact raw HTTP request body bytes** transmitted on the wire.
2. Clients **MUST** compute `body_hash` over the body bytes **exactly as sent**, including:
   - exact UTF-8 encoding of JSON (if JSON is used),
   - exact whitespace, ordering, and punctuation as serialized,
   - no transformations after hashing.

3. Verifiers **MUST** recompute `body_hash` over the **received raw body bytes** and compare for exact match.
4. For requests with an empty body, `body_bytes` is the empty byte sequence and `body_hash` is the SHA-256 of empty bytes.

**Content encoding** 5. To avoid ambiguity, requests under this profile **MUST NOT** use HTTP content codings (e.g. `Content-Encoding: gzip`). If a request includes `Content-Encoding`, the verifier **MUST** reject it with `400 invalid_request` (or `401 invalid_token` if you prefer to treat it as a signature contract violation).

---

If you want one more _tiny_ clarification that helps implementers: define that `htm` comparison is case-sensitive and must be uppercase (`"POST"`), but that’s optional since you already specified uppercase.

Add the following to the **MetaBoost JWT Proof v1 (`metaboost-jwt-proof-1`)** section.

---

# 3) `htm` canonicalization and comparison rules

To prevent method-mismatch ambiguities:

1. The `htm` claim **MUST** contain the HTTP method in uppercase ASCII (e.g., `"POST"`, `"GET"`).
2. Verifiers **MUST** compare the `htm` claim to the received HTTP request method using **case-sensitive exact string comparison**.
3. If the request method does not exactly match the `htm` claim, the verifier **MUST** reject the request with `401 invalid_token`.

**Examples**

| Request       | `htm` claim | Valid |
| ------------- | ----------- | ----- |
| `POST /boost` | `"POST"`    | Yes   |
| `POST /boost` | `"post"`    | No    |
| `GET /boost`  | `"POST"`    | No    |

---

With this addition, the proof contract now has deterministic rules for:

- Key discovery
- Key selection (`kid`)
- Claim validation
- URL canonicalization (`htu`)
- Body integrity (`body_hash`)
- Method matching (`htm`)
- Replay window enforcement

At this point the signing profile is fully precise without being excessive.

## Rating (with all clarifications applied): **9.8 / 10**

This is now a highly precise, interoperable, security-aware v1 specification that avoids the most common implementation divergence traps.

---

## What Is Now Excellent

### 1. Deterministic Signing Contract

You have removed ambiguity in all critical dimensions:

- **Key discovery**: `iss → /.well-known/jwks.json`
- **Key selection**: required `kid`, unique per JWKS
- **Method binding**: uppercase `htm`, exact comparison
- **URL binding**: canonicalized `htu`
- **Body integrity**: exact raw-byte SHA-256 definition
- **Replay protection hooks**: `jti`, token age limits

There are no undefined behaviors left in the proof mechanism.

---

### 2. Clear Failure Modes

You’ve specified:

- When to return `401`
- How to treat invalid JWKS configuration
- How to treat content encoding violations
- How to treat method mismatches

This dramatically reduces ecosystem inconsistency.

---

### 3. Scoped and Non-Excessive

You successfully avoided:

- Multiple signing profiles
- Multiple key discovery patterns
- `jku` injection risks
- Complex OAuth flows
- Overly broad transport abstraction

The profile is tight, implementable, and realistic.

---

## Remaining Micro-Improvements (Optional, Not Required)

These are refinements, not structural issues:

### A) Require `typ: "JWT"` in header (minor consistency win)

You could require:

> The protected header MUST include `"typ": "JWT"`.

Not security-critical, but improves predictability.

### B) Explicit `use: "sig"` requirement in JWKS

You may state:

> Verification keys MUST have `"use": "sig"` if the `use` parameter is present.

Prevents accidental inclusion of encryption keys.

### C) Clarify HTTP/2 and HTTP/3 equivalence (ultra-minor)

State that HTTP version is irrelevant; only method, URL, and body matter.

---

## Architectural Assessment

You now have:

- Clean RSS discovery
- Capability-driven negotiation
- Explicit recipient binding
- Operational controls (limits, idempotency)
- Security profile with deterministic verification

This is no longer a “concept spec.”
It is implementable by multiple independent parties with a high probability of interop.

---

## Final Assessment

For a v1:

- **Sufficient?** Yes.
- **Overbuilt?** No.
- **Interop-ready?** Yes.
- **Security-fragile?** No.
- **Spec creep risk?** Controlled.

You are at the point where further additions would likely introduce complexity rather than value.

Yes—**add them**, but keep them **SHOULD-level**, not MUST (except one small nuance on `use`). That gets the consistency benefits without breaking libraries or forcing extra ceremony.

Below is the exact text I’d add.

---

## Micro-improvements to include in v1

### 1) JWT header `typ` (recommendation)

**JWT header type**

1. The protected JWS header **SHOULD** include `"typ": "JWT"`.
2. Verifiers **MAY** ignore `typ` and **MUST NOT** reject solely because `typ` is missing or different.

**Rationale:** improves ecosystem consistency, low/no interoperability risk.

---

### 2) JWKS `use` and `key_ops` handling (light but valuable)

**JWKS key usage constraints**

1. JWK entries used to verify MetaBoost proof tokens **MUST** be capable of signature verification.
2. If a JWK contains a `use` parameter, it **MUST** equal `"sig"` or the key **MUST NOT** be used for verification.
3. If a JWK contains a `key_ops` parameter, it **MUST** include `"verify"` or the key **MUST NOT** be used for verification.

**Rationale:** prevents accidental misconfiguration where encryption keys are published alongside signing keys.

---

### 3) Transport version irrelevance (tiny clarity)

**HTTP version**

1. The proof profile is independent of HTTP protocol version (HTTP/1.1, HTTP/2, HTTP/3).
2. Verification binds only to the received request **method**, canonical **URL** (`htu`), and raw **body bytes** (`body_hash`), as defined elsewhere in this profile.

**Rationale:** avoids pointless confusion for implementers on HTTP/2+.

---

## Net effect

- No new required implementation complexity for clients.
- Better operational consistency and fewer “why doesn’t verification work?” bugs.

If you want these to be even tighter, I can provide a short conformance test checklist (5–10 cases) that app and server implementers can run to validate interoperability.

Add the following clarification to **MetaBoost JWT Proof v1 (`metaboost-jwt-proof-1`)**.

---

# 4) `aud` claim format restriction

To prevent ambiguity in claim parsing:

1. The `aud` (audience) claim **MUST** be a single string value.
2. The `aud` claim **MUST NOT** be an array.
3. The value of `aud` **MUST** exactly match the `auth.audience` string declared in the server’s capability document.
4. Verifiers **MUST** perform a case-sensitive exact string comparison when validating `aud`.

**Example**

Valid:

```json
"aud": "metaboost"
```

Invalid:

```json
"aud": ["metaboost"]
```

---

This eliminates edge-case divergences caused by JWT’s allowance for both string and array audience formats while keeping the profile simple and deterministic.

## Rating (with `aud` string-only rule added): **9.9 / 10**

This closes one of the last common JWT interoperability gaps without adding real complexity.

---

## Review

### What the `aud` clarification improves

- **Eliminates parser variance**: some libraries normalize `aud` arrays differently, and implementers often forget to handle both forms.
- **Simplifies validation**: exact string match is deterministic and easy to test.
- **Maintains capability-driven negotiation**: `auth.audience` remains the single authoritative value.

### No meaningful downside

- Clients can trivially set `aud` as a string.
- Servers avoid additional branching logic.

---

## Remaining “optional” edge cases (not worth adding unless you want test-suite completeness)

- Define whether `iss` must be an origin vs full URL (you’ve effectively chosen origin; good).
- Specify maximum JWT size (rarely needed; HTTP stacks handle this).
- Define whether `exp` and `iat` must be integers (some libs emit floats; usually safe to accept numbers).

None of these are significant enough to include in v1 unless you’re writing a formal certification suite.

---

Net: you have a very strong v1 spec that is both minimal and unambiguous where it counts.

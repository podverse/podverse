## Boostbox Auth and Spam Mitigation Options

### Problem

Boostbox expects a private `X-Api-Key` per instance. In a decentralized RSS ecosystem,
podcast apps cannot realistically discover or exchange those keys for millions of feeds.
If the endpoint stays locked, legitimate clients are blocked. If it is fully open, spam
can overwhelm hosts. We need options that preserve openness while discouraging abuse.

### Goals

- Allow any compliant app to submit boost messages without manual coordination.
- Reduce spam and automated abuse at scale.
- Keep implementation simple enough for small hosts.
- Avoid heavy dependencies on centralized registries.
- Maintain backward compatibility where possible.

### Option A: Open Endpoint + Abuse Controls (No App Auth)

Make the endpoint public and rely on operational controls:

- IP-based rate limiting with adaptive throttling.
- Request size limits and strict schema validation.
- Basic bot detection and heuristic scoring.
- Per-feed quotas (based on feed GUID or pubkey).

Pros: Minimal coordination, easiest for apps.
Cons: Ongoing operational burden, false positives, attackers can rotate IPs.

### Option B: Proof of Work (Client-Side Puzzle)

Require a small hashcash-style puzzle per request:

- Server issues a nonce and difficulty.
- Client computes a proof and includes it in the request.
- Server verifies quickly and accepts if valid.

Pros: No key exchange, raises cost of spam.
Cons: Adds latency and CPU usage for clients, hard on low-power devices.

### Option C: Signed Payloads (Publisher or App Keys)

Require a signature on each boost message:

- Podcaster publishes a public key in the RSS feed or value tag.
- Apps sign payloads with their own keys and register them in a public directory.
- Boostbox verifies signatures against published keys.

Pros: Strong integrity, auditable senders.
Cons: Needs key distribution and rotation, increases complexity.

### Option D: Short-Lived Tokens (Challenge/Response)

Use a challenge step to mint temporary tokens:

- Client requests a token with proof (PoW or signature).
- Server returns a short-lived token for subsequent posts.

Pros: Reduces per-request overhead, discourages naive spam.
Cons: Adds state and complexity, requires token storage.

### Option E: Relay or Message Broker Layer

Introduce a relay network or broker:

- Apps post to relays with their own auth.
- Relays enforce spam policies and forward to Boostbox.

Pros: Offloads abuse handling, scalable policy enforcement.
Cons: Adds dependency on relay availability and governance.

### Option F: Economic Disincentives (Pay-to-Post)

Charge a tiny fee to post boost metadata:

- Fee can be paid via LN or per-app deposit.
- Boostbox validates payment proof before accepting.

Pros: Strong spam deterrent.
Cons: Adds payment complexity and potential user friction.

### Option G: Feed-Published Allowlist

Allow podcasters to publish an allowlist of app keys in the feed:

- Apps discover allowed keys programmatically.
- Boostbox accepts only allowlisted keys.

Pros: Decentralized control by publisher.
Cons: Requires feed updates and app coordination.

### Tradeoffs Summary

- **Open + controls** is simplest but shifts burden to hosts.
- **PoW** and **economic disincentives** deter abuse without keys.
- **Signed payloads** and **allowlists** improve integrity but require key exchange.
- **Relays** and **tokens** can scale but add infrastructure and complexity.

### Suggested MVP Path

- Make `POST /boost` open for compliant payloads.
- Add strict validation and per-IP rate limits.
- Add optional PoW for high-volume clients.
- Plan for signatures or token exchange as a later upgrade.

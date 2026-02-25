## Boostbox Registry-Based Auth Spec (Concrete)

### Overview

This spec defines a registry-driven allowlist system for Boostbox. Apps send signed
boost metadata to Boostbox. Boostbox validates signatures using the app public keys
published in a registry, and only accepts requests from apps the host has enabled.

### Goals

- Allow hosts to control which apps can post to Boostbox.
- Avoid per-app API keys and manual distribution.
- Provide a clear key rotation and compromise response flow.

### Actors

- **Registry**: Public directory of apps and their signing public keys.
- **App**: A podcast app that signs boost messages.
- **Boostbox host**: Operator who chooses which apps are allowed.

### Data Model

#### Registry App Record

- `app_id`: stable string identifier.
- `name`: display name.
- `website`: canonical URL.
- `contact`: email or URL.
- `public_keys`: array of signing keys with metadata.
  - `key_id`: stable key identifier.
  - `public_key`: ed25519 or secp256k1 public key.
  - `status`: `active` | `revoked` | `rotated`.
  - `created_at`, `revoked_at` (optional).

#### Boostbox Allowlist

- `allowed_app_ids`: list of app IDs enabled by host.
- `allowed_key_ids`: optional, if host wants to pin to specific keys.

### Protocol

#### 1) Registry Discovery

Boostbox host config includes a registry URL, for example:

- `https://registry.example.org/apps.json`

Boostbox fetches and caches the registry (with ETag and TTL).

#### 2) App Signing

Apps sign each request with a current private key:

- `signature = Sign(private_key, hash(payload + timestamp + nonce))`

The request includes:

- `app_id`
- `key_id`
- `timestamp`
- `nonce`
- `payload`
- `signature`

#### 3) Boostbox Verification

On request:

- Lookup `app_id` in registry cache.
- Verify `key_id` exists and is `active`.
- Verify `signature` against the public key.
- Enforce replay protection using `timestamp + nonce`.
- Verify `app_id` is allowed by host.

If any step fails, return `401 Unauthorized` or `403 Forbidden`.

### Registry API (Minimal)

`GET /apps.json`

Returns:

```json
{
  "updated_at": "2026-02-20T00:00:00Z",
  "apps": [
    {
      "app_id": "podverse",
      "name": "Podverse",
      "website": "https://podverse.fm",
      "contact": "security@podverse.fm",
      "public_keys": [
        {
          "key_id": "podverse-2026-01",
          "public_key": "ed25519:AbCdEf...",
          "status": "active",
          "created_at": "2026-01-01T00:00:00Z"
        }
      ]
    }
  ]
}
```

### Boostbox UI

Boostbox host UI displays a list of apps from the registry:

- Enabled by default (configurable).
- Host can disable specific apps.
- Optional advanced mode: allow only specific `key_id` values.

### Key Security and Compromise Prevention

#### Registry Side

- Registry stores only public keys. No private keys are ever uploaded.
- Registry requires apps to prove control of a key before publishing:
  - Challenge: registry issues a nonce.
  - App signs nonce with private key.
  - Registry verifies signature and accepts key.
- Registry logs changes to keys with timestamps and optional signatures.

#### App Side

- Private keys must remain offline or in HSM/secure enclave.
- Signing service should run in a hardened environment.
- Rotate keys periodically and after any suspected compromise.

### Key Rotation and Revocation

1. App generates a new key pair.
2. App registers the new public key (status `active`).
3. App updates signing service to use the new key.
4. Registry marks old key as `rotated` or `revoked`.
5. Boostbox hosts auto-refresh registry cache:
   - Old keys are rejected once marked `revoked`.
   - Optionally allow a short overlap window for `rotated`.

### Replay Protection

- Boostbox stores recent `(app_id, nonce, timestamp)` tuples.
- Reject duplicates or timestamps outside a small window (for example 5 minutes).

### Failure Modes and Handling

- Registry unavailable: use cached registry for a limited time.
- Key revoked: requests signed with that key are rejected immediately.
- App removed from allowlist: requests rejected with `403 Forbidden`.

### Alternatives / Threat Mitigation Options

This section covers alternative approaches for Boostbox auth and spam mitigation that do not rely
on the registry allowlist flow.

#### Option A: Open Endpoint + Abuse Controls (No App Auth)

Make the endpoint public and rely on operational controls:

- IP-based rate limiting with adaptive throttling.
- Request size limits and strict schema validation.
- Basic bot detection and heuristic scoring.
- Per-feed quotas (based on feed GUID or pubkey).

Pros: Minimal coordination, easiest for apps.
Cons: Ongoing operational burden, false positives, attackers can rotate IPs.

#### Option B: Proof of Work (Client-Side Puzzle)

Require a small hashcash-style puzzle per request:

- Server issues a nonce and difficulty.
- Client computes a proof and includes it in the request.
- Server verifies quickly and accepts if valid.

Pros: No key exchange, raises cost of spam.
Cons: Adds latency and CPU usage for clients, hard on low-power devices.

#### Option C: Signed Payloads (Publisher or App Keys)

Require a signature on each boost message:

- Podcaster publishes a public key in the RSS feed or value tag.
- Apps sign payloads with their own keys and register them in a public directory.
- Boostbox verifies signatures against published keys.

Pros: Strong integrity, auditable senders.
Cons: Needs key distribution and rotation, increases complexity.

#### Option D: Short-Lived Tokens (Challenge/Response)

Use a challenge step to mint temporary tokens:

- Client requests a token with proof (PoW or signature).
- Server returns a short-lived token for subsequent posts.

Pros: Reduces per-request overhead, discourages naive spam.
Cons: Adds state and complexity, requires token storage.

#### Option E: Relay or Message Broker Layer

Introduce a relay network or broker:

- Apps post to relays with their own auth.
- Relays enforce spam policies and forward to Boostbox.

Pros: Offloads abuse handling, scalable policy enforcement.
Cons: Adds dependency on relay availability and governance.

#### Option F: Economic Disincentives (Pay-to-Post)

Charge a tiny fee to post boost metadata:

- Fee can be paid via LN or per-app deposit.
- Boostbox validates payment proof before accepting.

Pros: Strong spam deterrent.
Cons: Adds payment complexity and potential user friction.

#### Option G: Feed-Published Allowlist

Allow podcasters to publish an allowlist of app keys in the feed:

- Apps discover allowed keys programmatically.
- Boostbox accepts only allowlisted keys.

Pros: Decentralized control by publisher.
Cons: Requires feed updates and app coordination.

#### Tradeoffs Summary

- **Open + controls** is simplest but shifts burden to hosts.
- **PoW** and **economic disincentives** deter abuse without keys.
- **Signed payloads** and **allowlists** improve integrity but require key exchange.
- **Relays** and **tokens** can scale but add infrastructure and complexity.

#### Suggested MVP Path

- Make `POST /boost` open for compliant payloads.
- Add strict validation and per-IP rate limits.
- Add optional PoW for high-volume clients.
- Plan for signatures or token exchange as a later upgrade.

### Implementation Notes

- Prefer ed25519 for signatures (fast and widely supported).
- Sign a canonicalized payload to avoid signature mismatches.
- Include `app_id`, `key_id`, and `timestamp` in the signed content.

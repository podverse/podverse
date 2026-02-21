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

### Implementation Notes

- Prefer ed25519 for signatures (fast and widely supported).
- Sign a canonicalized payload to avoid signature mismatches.
- Include `app_id`, `key_id`, and `timestamp` in the signed content.

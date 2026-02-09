# 06a1: Add-by-RSS Basic Auth – Credential Encryption (Optional)

## Goal

Add application-level encryption for add-by-RSS Basic Auth username and password
stored in `account_following_add_by_rss_channel`. Credentials are encrypted
before write and decrypted only when loading for outbound feed requests.
**Do not** use the JWT auth key; use a dedicated encryption key.

**Parent / prerequisite**: [06a-basic-auth-schema-orm.md](06a-basic-auth-schema-orm.md).
This plan is optional and can be implemented after 06a (which may store
plaintext and rely on DB/infra security) or in tandem if 06a is designed with
encryption in mind from the start.

---

## Why not the JWT secret?

- **AUTH_JWT_SECRET** is for signing/verifying tokens. Using it for encryption
  couples two different concerns and makes key rotation painful: rotating the
  JWT secret would require re-encrypting every stored credential with the new
  key (or losing the ability to decrypt them).
- Use a **dedicated encryption key** (separate env var) so rotation of
  credentials encryption is independent of auth.

---

## Recommendation: simple and adequately secure

- **Algorithm**: AES-256-GCM (authenticated encryption; Node crypto built-in).
- **Key**: One env var, e.g. `ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY` (32-byte
  key for AES-256, or a password passed through a KDF). Validate at startup only
  when Basic Auth columns are present and in use.
- **Scope**: Encrypt `basic_auth_username` and `basic_auth_password` (Option A
  from 06a) before persisting; decrypt in `getCredentialsForFeed` only. No
  change to API surface or client behavior.
- **Key rotation**: Documented procedure: add new key env, run a one-off
  migration or script that decrypts each row with the old key and re-encrypts
  with the new key, then retire the old key. No coupling to JWT rotation.

---

## Prerequisites

- 06a implemented: columns `basic_auth_username` and `basic_auth_password`
  (or single blob column if Option B) on `account_following_add_by_rss_channel`;
  ORM entity and `getCredentialsForFeed(accountId, feedUrl)` exist.
- If 06a initially stores plaintext: this plan adds a small encryption layer in
  the ORM service (or a dedicated helper) so that writes encrypt and
  `getCredentialsForFeed` decrypts. Optionally add a migration to encrypt
  existing plaintext rows.

---

## Step 1: Encryption helper

- **No package reads `process.env`.** The encryption key is passed in through
  the factory. Add an optional field to **ORMConfig** (e.g.
  `addByRssCredentialsEncryptionKey?: string`) in
  `packages/orm/src/config/types.ts`. The **app** reads
  `ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY` from env, adds it to the object it
  passes to `createORMContext(config)`, and (if used) validates it in
  app-level startup validation.
- Add a small module in `packages/orm` (e.g.
  `packages/orm/src/lib/credentialsEncryption.ts`) that:
  - **Gets the key from ORM context** (e.g.
    `getORMConfig().addByRssCredentialsEncryptionKey`) when encrypting or
    decrypting. If the key is missing and decryption is requested, return null
    or throw; if encryption is requested and key is missing, throw.
  - Exposes `encryptCredentials(plaintext: string): string` and
    `decryptCredentials(ciphertext: string): string` using Node `crypto`
    (AES-256-GCM). Use a random IV per encryption and store IV + ciphertext
    in a single column or alongside (e.g. base64 IV + ciphertext).
- Key format: 32 bytes for AES-256. If env is a password, derive key with
  crypto.pbkdf2 or similar; the **app** is responsible for producing the key
  (or raw bytes) and putting it on config. Document the derivation in app or
  plan.

---

## Step 2: Wire encryption into persistence

- Where the API/ORM writes `basic_auth_username` and `basic_auth_password`
  (e.g. in `addOrUpdateRSSChannel` or the controller): before persisting, call
  the encryption helper and store the ciphertext (and IV if stored separately).
- If using two columns: encrypt each value; or encrypt a single JSON/concatenated
  value and store in one column. Document the stored format.

---

## Step 3: Wire decryption into getCredentialsForFeed

- In `getCredentialsForFeed(accountId, feedUrl)`: after loading the row(s),
  decrypt the stored value(s) and return `{ username, password }` in plaintext
  only in memory; never log or expose. If decryption fails (e.g. wrong key),
  return null or throw so callers do not use bad credentials. **Callers must use
  the result only when non-null** (Basic Auth only when credentials are saved
  for that feed).

---

## Step 4: Env and startup

- **App responsibility:** Add `ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY` to the
  **app's** env validation and config (e.g. API and workers). When building
  `ormConfig`, set `ormConfig.addByRssCredentialsEncryptionKey` from that app
  config. Document in the app's ENV.md or startup validation.
- Update **.env.example** for each app that uses the key (API and workers): add
  `ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY` with a short comment (e.g. optional,
  32-byte key for AES-256, or document format). Update `apps/api/.env.example`,
  `apps/workers/.env.example`. If the project also maintains env templates
  under `infra/config/env-templates/`, add the var to `api.env.example` and
  `workers.env.example` there as well.
- **Documentation:** Document the var in the app's ENV.md (or equivalent) and
  in startup validation comments: purpose (encrypt add-by-RSS Basic Auth
  credentials), optional vs required when Basic Auth is used, key format, and
  that it is passed into the ORM via `createORMContext` (no package reads
  `process.env`).
- **ORM:** No env reading. The ORM only receives the key via
  `createORMContext(config)`. If the key is missing in config and a row has
  encrypted data, decryption fails safely (no fallback to plaintext).

---

## Step 5: Key rotation (documentation)

- Document a key-rotation procedure: e.g. set
  `ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY_OLD` to current key, set
  `ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY` to new key; run a script that
  selects rows with non-null credentials, decrypts with OLD, re-encrypts with
  NEW, updates rows; then remove OLD from env. No JWT or auth changes.

---

## Deliverables checklist

- [ ] Encryption helper (encrypt/decrypt) using dedicated key and AES-256-GCM.
- [ ] Writes to Basic Auth columns go through encryption; `getCredentialsForFeed`
  decrypts before returning.
- [ ] Env var documented; validation as needed.
- [ ] `.env.example` updated for API and workers (and env-templates if used).
- [ ] Documentation updated (ENV.md or equivalent; startup validation); includes
  purpose, optional/required, key format.
- [ ] Key rotation procedure documented; no use of AUTH_JWT_SECRET.

---

## Files reference

| Area            | Path |
| --------------- | ---- |
| ORMConfig types | `packages/orm/src/config/types.ts` (add optional `addByRssCredentialsEncryptionKey?: string`) |
| Encryption util | New: e.g. `packages/orm/src/lib/credentialsEncryption.ts` |
| Service         | `packages/orm/src/services/account/accountFollowingAddByRSSChannel.ts` |
| App wiring      | Apps that use ORM (e.g. API, workers): read env, add key to `ormConfig` before `createORMContext(ormConfig)`; env validation in app (e.g. `apps/api/src/lib/startup/validation.ts`) |
| .env.example (API) | `apps/api/.env.example` |
| .env.example (workers) | `apps/workers/.env.example` |
| Env templates (optional) | `infra/config/env-templates/api.env.example`, `infra/config/env-templates/workers.env.example` |
| Documentation   | App-level env docs (e.g. `apps/api/ENV.md`, `apps/workers/ENV.md`) |

---

## Alternative: no app-level encryption

If the team prefers **simplest operation**: skip this plan and rely on database
encryption at rest and access control. 06a then stores plaintext in the
Basic Auth columns. That is adequate for many deployments; this plan is for
teams that want an extra layer so a DB dump or backup does not expose
credentials in plaintext.

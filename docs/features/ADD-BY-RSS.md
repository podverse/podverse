# Add-by-RSS

Add-by-RSS lets users follow RSS feeds (podcasts, music) that are not in the main directory. Feeds are parsed and stored in the user’s Add-by-RSS library.

## Basic Auth (private feeds)

Feeds that require HTTP Basic Auth are supported. When adding a feed, users can optionally provide a username and password. Credentials are stored per feed in the database (`account_following_add_by_rss_channel`). They are used only for server-side requests (feed parse, chapters, transcript); the password is never returned in any API response.

### Environment

Credentials are stored in the DB and looked up at request time. **Required:** set `ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY` (64 hex chars, 32 bytes) in the API and workers to encrypt credentials at rest (AES-256-GCM). See:

- [apps/api/ENV.md](/apps/api/ENV.md) – API
- [apps/workers/ENV.md](/apps/workers/ENV.md) – Workers (e.g. `mqAddByRSSRunParser`)

### Request paths that use credentials

- **Feed parse**: The add-by-RSS parser (worker) loads credentials for the feed and sends the Basic Auth header when fetching the feed XML.
- **Chapters / transcript**: The API endpoint that fetches chapters and transcript for add-by-RSS items uses stored credentials when the client sends `feedUrl` in the request body. For private feeds, the client must send `feedUrl` and the user must be logged in; otherwise no Basic Auth is applied.
- **Images**: If the backend ever proxies add-by-RSS images, credentials would be used; currently client-loaded images do not use server-side Basic Auth.

### Security

- Passwords are not included in list or detail API responses (only an optional username or `[saved]` placeholder may be returned when encrypted).
- Client does not persist the password after submit; it is cleared from form state after a successful add.
- Sensitive fields are redacted in debug logs (see `packages/orm/src/lib/redactForLog.ts`).
- **Encryption at rest:** Credentials are encrypted before write and decrypted only in `getCredentialsForFeed`. `ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY` is required. Do not use the JWT secret for this key; use a dedicated key so rotation is independent of auth.

### Key rotation

To rotate the encryption key without losing access to stored credentials:

1. Set `ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY_OLD` to the current key (64 hex chars) and `ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY` to the new key (generate with `openssl rand -hex 32`). Deploy or restart API and workers with both vars set.
2. **Dual-key decryption:** While `_OLD` is set, the API and workers will try the current key first, then the old key when decrypting. So existing ciphertext remains readable until it has been re-encrypted with the new key. You can run the re-encryption script while the app is live.
3. Run re-encryption. It selects all rows with credentials, decrypts with OLD key (for values starting with `v1:`), re-encrypts with NEW key, and updates the row. Required env: `ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY`, `ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY_OLD`, and DB vars.
   - **In Docker / Jenkins:** Use the workers command: `node apps/workers/dist/index.js reencryptAddByRSSCredentials` (same env as workers).
   - **Local (repo root):** Use the script with API env:  
     `node --env-file=apps/api/.env node_modules/.bin/ts-node scripts/add-by-rss/reencrypt-add-by-rss-credentials.ts`

4. After re-encryption completes, remove `ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY_OLD` from the environment and restart API and workers. No JWT or auth changes are required.

**Jenkins (alpha):** The job `aux_ops_add_by_rss_reencrypt_credentials` accepts parameters `OLD_KEY` and `NEW_KEY` (password type) and runs the workers command `reencryptAddByRSSCredentials` inside the workers container. It uses the same DB env as the alpha workers. See [infra/pipelines/jenkins/alpha/Jenkinsfile.aux_ops_add_by_rss_reencrypt_credentials](/infra/pipelines/jenkins/alpha/Jenkinsfile.aux_ops_add_by_rss_reencrypt_credentials).

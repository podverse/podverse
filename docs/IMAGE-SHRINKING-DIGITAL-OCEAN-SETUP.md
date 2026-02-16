# Image Shrinking — Digital Ocean Spaces Setup

This document describes how to set up **Digital Ocean Spaces** as the image CDN for the image shrinking service. It is the only implementation option documented at this time.

## Prerequisites

- A Digital Ocean account
- The image shrinking worker will need a Space (object storage bucket) and API credentials with read/write access to that Space

## 1. Create a Space

1. In the [Digital Ocean Control Panel](https://cloud.digitalocean.com/), go to **Spaces** in the left sidebar.
2. Click **Create Space**.
3. Choose a **datacenter region** (e.g. `nyc3`). This becomes your `IMAGE_CDN_REGION`.
4. Choose a **unique name** for the Space (e.g. `podverse-images`). This becomes your `IMAGE_CDN_BUCKET`.
5. Enable **CDN** (recommended) so you get a public CDN URL for the bucket.
6. Create the Space.

## 2. Get the CDN base URL

After the Space is created and CDN is enabled:

1. Open the Space in the control panel.
2. Under **Settings** or the Space overview, find the **CDN endpoint** or **Public URL**.
3. It will look like: `https://<space-name>.<region>.cdn.digitaloceanspaces.com`
4. Use this as `IMAGE_CDN_BASE_URL` (no trailing slash). Example: `https://podverse-images.nyc3.cdn.digitaloceanspaces.com`

## 3. Create Spaces access keys

The worker needs an access key and secret to upload objects.

1. In the control panel, go to **API** in the left sidebar (or **Spaces** → **Manage Keys** depending on the UI).
2. Under **Spaces access keys**, click **Generate New Key**.
3. Give the key a name (e.g. `podverse-workers-image-shrink`).
4. Copy the **Access Key** and **Secret** immediately; the secret is shown only once.
5. Use these as `DIGITAL_OCEAN_ACCESS_KEY` and `DIGITAL_OCEAN_SECRET_KEY` in the worker environment.

**Security:** Store the secret in a secrets manager or encrypted config (e.g. SOPS) for production; do not commit them to the repo.

## 4. Env vars summary

Set the following in the workers app (e.g. `apps/workers/.env` or your deployment config). See `apps/workers/.env.example` for the full template.

| Variable                   | Example / source                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------- |
| `DIGITAL_OCEAN_ACCESS_KEY` | From step 3 (Access Key)                                                            |
| `DIGITAL_OCEAN_SECRET_KEY` | From step 3 (Secret)                                                                |
| `IMAGE_CDN_REGION`         | Space region, e.g. `nyc3`                                                           |
| `IMAGE_CDN_BUCKET`         | Space name, e.g. `podverse-images`                                                  |
| `IMAGE_CDN_BASE_URL`       | CDN URL from step 2, e.g. `https://podverse-images.nyc3.cdn.digitaloceanspaces.com` |

Plus the remaining [image shrink env vars](IMAGE-SHRINKING-SERVICE.md#required-environment-variables) (`IMAGE_SHRINK_WIDTH_PX`, `IMAGE_SHRINK_BATCH_SIZE`, etc.).

## 5. Verify the Space is writable

After the worker is configured, running the backfill and consumer will upload WebP objects under the key prefix `images/`. You can confirm uploads in the Digital Ocean control panel by opening the Space and browsing the `images/` folder, or by checking that `channel_image` / `item_image` rows have `is_resized = true` and URLs starting with your `IMAGE_CDN_BASE_URL`.

## References

- [Image Shrinking Service](IMAGE-SHRINKING-SERVICE.md) — overview, flow, and env vars
- [Image Shrinking Testing](IMAGE-SHRINKING-TESTING.md) — how to run and test the service locally or in staging

# Image Shrinking — Bucket Providers (S3-Compatible)

This guide describes how to configure **object storage** for the image shrinking worker. The worker
uses an **S3-compatible API** (`s3mini`) with **`BUCKET_PROVIDER`** selecting built-in endpoint
behavior. Use **`BUCKET_CDN_BASE_URL`** as the public URL prefix stored in the database (CDN,
reverse proxy, or direct bucket URL).

Full env templates: **`apps/workers/.env.example`**. Kubernetes: workers ConfigMap +
**Secret `podverse-workers-storage-bucket-opaque`** (`BUCKET_ACCESS_KEY`, `BUCKET_SECRET_KEY`).

## Shared variables

| Variable              | Role                                                                        |
| --------------------- | --------------------------------------------------------------------------- |
| `BUCKET_PROVIDER`     | One of: `digitalocean`, `aws-s3`, `backblaze-b2`, `garage`, `s3-compatible` |
| `BUCKET_ACCESS_KEY`   | S3-compatible access key (often in a K8s Secret)                            |
| `BUCKET_SECRET_KEY`   | S3-compatible secret key (often in a K8s Secret)                            |
| `BUCKET_REGION`       | Provider region slug (e.g. DO `nyc3`, AWS `us-east-1`, B2 `us-west-004`)    |
| `BUCKET_NAME`         | Bucket (Space / bucket) name                                                |
| `BUCKET_CDN_BASE_URL` | Public base URL for resized images (**no** trailing slash)                  |

## Provider-sensitive variables

| Variable                   | When to set                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `BUCKET_ENDPOINT`          | **Required** for `garage` and `s3-compatible`. Optional override for other providers (S3 API URL).                                   |
| `BUCKET_FORCE_PATH_STYLE`  | `true` / `false` or unset. Unset = provider default (path-style for Garage/B2/s3-compatible).                                        |
| `BUCKET_UPLOAD_PUBLIC_ACL` | Unset = provider default (`public-read` for DO/AWS/B2; omit header for Garage/s3-compatible). Empty string = never send `x-amz-acl`. |

## DigitalOcean Spaces

1. Create a **Space**, enable **CDN**, note region (`nyc3`) and bucket name.
2. Create **Spaces access keys** (not the API Personal Access Token).
3. Set:
   - `BUCKET_PROVIDER=digitalocean`
   - `BUCKET_REGION`, `BUCKET_NAME`
   - `BUCKET_CDN_BASE_URL` — CDN endpoint, e.g. `https://<space>.<region>.cdn.digitaloceanspaces.com`
   - Optional: `BUCKET_ENDPOINT=https://<region>.digitaloceanspaces.com` if you need a non-default regional endpoint.

Virtual-hosted URLs are built automatically; uploads use `x-amz-acl: public-read` unless overridden.

## AWS S3

1. Create an **IAM user** (or role for IRSA) with `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket`
   on the target bucket.
2. Set:
   - `BUCKET_PROVIDER=aws-s3`
   - `BUCKET_REGION`, `BUCKET_NAME`
   - `BUCKET_CDN_BASE_URL` — CloudFront distribution URL, static website endpoint, or
     `https://<bucket>.s3.<region>.amazonaws.com` if the bucket is public-read.

Default ACL header: `public-read` (omit with `BUCKET_UPLOAD_PUBLIC_ACL=` if you rely on bucket
policy only).

## Backblaze B2 (S3-compatible API)

1. In the B2 console, create an **Application Key** with access to the bucket (S3-compatible keys).
2. Use the **S3 endpoint** for your bucket’s region (shown in the B2 UI), e.g.
   `https://s3.us-west-004.backblazeb2.com`.
3. Set:
   - `BUCKET_PROVIDER=backblaze-b2`
   - `BUCKET_REGION` — B2 region id (e.g. `us-west-004`)
   - `BUCKET_NAME`, keys from B2
   - `BUCKET_CDN_BASE_URL` — public bucket URL or your CDN in front of B2

Path-style access is the default; you normally **do not** need `BUCKET_ENDPOINT` unless you
override the regional endpoint.

## Garage (self-hosted)

Garage exposes an **S3 API**. Typical setups use **path-style** URLs against your Gateway endpoint.

1. Deploy Garage and create a bucket; obtain the **S3 API base URL** (e.g.
   `https://garage.example.com` or `http://127.0.0.1:3900`).
2. Set:
   - `BUCKET_PROVIDER=garage`
   - **`BUCKET_ENDPOINT`** — required (gateway base URL, `https://` or `http://`)
   - `BUCKET_REGION` — use the region string Garage expects (often `garage` or your layout key)
   - `BUCKET_NAME` — bucket id in Garage
   - `BUCKET_CDN_BASE_URL` — URL users hit in the browser (reverse proxy / CDN in front of Garage)

Default: **no** `x-amz-acl` on upload (`BUCKET_UPLOAD_PUBLIC_ACL` empty). Make objects publicly
readable via Garage bucket policy / web gateway.

If you terminate TLS with a hostname and map **`bucket.hostname`** for reads, you can set
`BUCKET_FORCE_PATH_STYLE=false` and **`BUCKET_ENDPOINT`** to that hostname base so virtual-hosted
style URLs are constructed (advanced).

## Generic `s3-compatible` (MinIO, Cloudflare R2, Ceph, …)

1. Obtain the **S3 endpoint**, access key, and secret for your deployment.
2. Set:
   - `BUCKET_PROVIDER=s3-compatible`
   - **`BUCKET_ENDPOINT`** — required (e.g. `https://<account>.r2.cloudflarestorage.com` for R2,
     `http://localhost:9000` for MinIO)
   - `BUCKET_REGION` — many providers accept `auto` or a fixed string; follow provider docs
   - `BUCKET_NAME`, keys
   - `BUCKET_CDN_BASE_URL` — public URL users use (Workers, CDN, or presigned-only workflows may use
     a different pattern — align with how you serve images)

For **Cloudflare R2**, set `BUCKET_UPLOAD_PUBLIC_ACL=` (empty) — R2 rejects `x-amz-acl` by default.

Tune **`BUCKET_FORCE_PATH_STYLE`** per provider (MinIO often path-style; some proxies use
virtual-hosted).

## Verify uploads

After configuring the worker, run backfill / consumer and confirm:

- Objects appear under the `images/` prefix in storage.
- `channel_image` / `item_image` rows show `is_resized = true` and URLs starting with
  **`BUCKET_CDN_BASE_URL`**.

## References

- [Image shrinking service overview](SERVICE.md)
- [Testing](TESTING.md)

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

| Variable                  | When to set                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| `BUCKET_ENDPOINT`         | **Required** for `garage` and `s3-compatible`. Optional override for other providers (S3 API URL). |
| `BUCKET_FORCE_PATH_STYLE` | `true` / `false` or unset. Unset = provider default (path-style for Garage/B2/s3-compatible).      |

## DigitalOcean Spaces

1. Create a **Space**, enable **CDN**, note region (`nyc3`) and bucket name.
2. Create **Spaces access keys** (not the API Personal Access Token).
3. Set:
   - `BUCKET_PROVIDER=digitalocean`
   - `BUCKET_REGION`, `BUCKET_NAME`
   - `BUCKET_CDN_BASE_URL` — CDN endpoint, e.g. `https://<space>.<region>.cdn.digitaloceanspaces.com`
   - Optional: `BUCKET_ENDPOINT=https://<region>.digitaloceanspaces.com` if you need a non-default regional endpoint.

Virtual-hosted URLs are built automatically; resized uploads send `x-amz-acl: public-read`
(provider-defined).

## AWS S3

1. Create an **IAM user** (or role for IRSA) with `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket`
   on the target bucket.
2. Set:
   - `BUCKET_PROVIDER=aws-s3`
   - `BUCKET_REGION`, `BUCKET_NAME`
   - `BUCKET_CDN_BASE_URL` — CloudFront distribution URL, static website endpoint, or
     `https://<bucket>.s3.<region>.amazonaws.com` if the bucket is public-read.

Resized uploads send `x-amz-acl: public-read` (provider-defined). You can still use bucket policies
for `GetObject` as needed.

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

The **garage** provider omits `x-amz-acl` on upload. Make objects publicly readable via Garage
bucket policy / web gateway.

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

For **Cloudflare R2**, use `BUCKET_PROVIDER=s3-compatible` — the worker omits `x-amz-acl` (R2
rejects that header). Configure public reads in the R2 dashboard or bucket rules.

Tune **`BUCKET_FORCE_PATH_STYLE`** per provider (MinIO often path-style; some proxies use
virtual-hosted).

## Verify uploads

After configuring the worker, run backfill / consumer and confirm:

- Objects appear under the `images/` prefix in storage.
- `channel_image` / `item_image` rows show `is_resized = true` and URLs starting with
  **`BUCKET_CDN_BASE_URL`**.

## Troubleshooting: `AccessDenied` (Spaces / S3-compatible)

**Upload ACL (workers):** For `digitalocean`, `aws-s3`, and `backblaze-b2`, resized uploads always
send `x-amz-acl: public-read`. For `garage` and `s3-compatible`, the worker omits `x-amz-acl` —
configure public reads with the provider (bucket policy, R2 rules, etc.).

### Bucket root URL returns `AccessDenied`

Opening the **origin** hostname without an object key (for example
`https://<space>.<region>.digitaloceanspaces.com`) performs a **bucket list** for anonymous users.
If **File listing** is **Restricted** in the DigitalOcean control panel, that response is
**expected**. It does **not** by itself mean individual objects are private.

### CDN or object URL returns `403` / `AccessDenied`

**CDN enabled** does not make objects public. Anonymous `GET` still needs **public-read** on each
object (via `x-amz-acl` on upload) or a **bucket policy** that allows `s3:GetObject` for the
relevant prefix.

Verify from any machine (no DO login):

```bash
curl -sI "https://<space>.<region>.cdn.digitaloceanspaces.com/images/item/101/<object-key>.webp"
```

- **`HTTP/2 200`** (or `200`) with an image `content-type` → object is publicly readable.
- **`403`** with `content-type: application/xml` → object is still **private**; fix ACL or policy,
  not file listing.

**DigitalOcean UI:** **Files** → select the object → **More** → set **Public read** (wording may
vary), or attach a **bucket policy** that allows `GetObject` for `Principal: "*"` on a prefix such
as `images/*`.

Example policy (tight prefix; replace `<bucket>` with your Space name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadImages",
      "Effect": "Allow",
      "Principal": "*",
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::<bucket>/images/*"]
    }
  ]
}
```

## References

- [Image shrinking service overview](SERVICE.md)
- [Testing](TESTING.md)
